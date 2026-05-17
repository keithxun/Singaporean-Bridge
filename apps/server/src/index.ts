import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  addBot,
  addChatMessage,
  applyAction,
  createRoom,
  getRoom,
  joinRoom,
  removeBot,
  snapshotFor,
  startNextDeal,
  startRoomGame,
  takeSeat,
  type Room,
} from './rooms.js';
import { botBid, botCallPartner, botPlay } from './bot.js';
import { viewFor, type GameState } from '@sgb/shared';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigin: string | string[] = ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS;

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/rooms', (_req, res) => {
  const room = createRoom();
  res.json({ code: room.code });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: corsOrigin } });

function broadcast(room: Room): void {
  for (const p of room.players.values()) {
    io.to(socketIdFor(p.playerId, room.code)).emit('room:state', snapshotFor(room, p.playerId));
  }
  // Schedule bot moves if it's a bot's turn
  if (room.game && room.game.phase !== 'scored') {
    const seat = room.game.turn;
    const bot = Array.from(room.players.values()).find((p) => p.seat === seat && p.isBot);
    if (bot) {
      setTimeout(() => {
        try {
          playBotMove(room, bot.playerId);
          broadcast(room);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[${room.code}] bot move error for ${bot.name}: ${message}`);
        }
      }, 1000 + Math.random() * 1000); // 1-2 sec delay for natural feel
    }
  }
}

function playBotMove(room: Room, botId: string): void {
  if (!room.game) throw new Error('no game');
  const bot = room.players.get(botId);
  if (!bot || !bot.isBot) throw new Error('not a bot');
  const seat = bot.seat;
  if (seat === undefined) throw new Error('bot not seated');
  const difficulty = bot.botDifficulty || 'smart';
  const view = viewFor(room.game, seat);

  if (room.game.phase === 'bidding') {
    const action = botBid(view, difficulty);
    applyAction(room, botId, { type: 'bid', bid: action });
  } else if (room.game.phase === 'callPartner') {
    const card = botCallPartner(view.myHand, view.contract?.trump);
    applyAction(room, botId, { type: 'callPartner', card });
  } else if (room.game.phase === 'play') {
    const card = botPlay(view, view.myHand, difficulty);
    applyAction(room, botId, { type: 'play', card });
  }
}

// Track socket per (room, playerId).
const sockets = new Map<string, string>(); // key: roomCode|playerId -> socketId
const socketKey = (playerId: string, room: string) => `${room}|${playerId}`;
function socketIdFor(playerId: string, room: string): string {
  return sockets.get(socketKey(playerId, room)) ?? '';
}

io.on('connection', (socket) => {
  let joinedRoom: string | undefined;
  let joinedPlayerId: string | undefined;

  socket.on('room:join', ({ code, playerId, name }, ack) => {
    try {
      const room = getRoom(code);
      if (!room) throw new Error('room not found');
      joinRoom(room, playerId, name);
      joinedRoom = room.code;
      joinedPlayerId = playerId;
      sockets.set(socketKey(playerId, room.code), socket.id);
      socket.join(room.code);
      ack?.({ ok: true, snapshot: snapshotFor(room, playerId) });
      broadcast(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ack?.({ ok: false, error: message });
    }
  });

  socket.on('seat:take', ({ seat }, ack) => {
    try {
      if (!joinedRoom || !joinedPlayerId) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      takeSeat(room, joinedPlayerId, seat);
      ack?.({ ok: true });
      broadcast(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ack?.({ ok: false, error: message });
    }
  });

  socket.on('bot:add', ({ seat, difficulty }, ack) => {
    try {
      if (!joinedRoom) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      addBot(room, seat, difficulty || 'smart');
      ack?.({ ok: true });
      broadcast(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ack?.({ ok: false, error: message });
    }
  });

  socket.on('bot:remove', ({ playerId }, ack) => {
    try {
      if (!joinedRoom) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      removeBot(room, playerId);
      ack?.({ ok: true });
      broadcast(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ack?.({ ok: false, error: message });
    }
  });

  socket.on('game:start', (_payload, ack) => {
    try {
      if (!joinedRoom) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      startRoomGame(room);
      ack?.({ ok: true });
      broadcast(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ack?.({ ok: false, error: message });
    }
  });

  socket.on('game:nextDeal', (_payload, ack) => {
    try {
      if (!joinedRoom) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      startNextDeal(room);
      ack?.({ ok: true });
      broadcast(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ack?.({ ok: false, error: message });
    }
  });

  socket.on('action', (action, ack) => {
    try {
      if (!joinedRoom || !joinedPlayerId) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      const prevTricksCount = room.game?.tricks.length ?? 0;
      applyAction(room, joinedPlayerId, action);
      ack?.({ ok: true });
      const currTricksCount = room.game?.tricks.length ?? 0;
      // If a trick just completed, delay broadcast to show the completed trick
      const delay = currTricksCount > prevTricksCount ? 1500 : 0;
      setTimeout(() => broadcast(room), delay);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ack?.({ ok: false, error: message });
    }
  });

  socket.on('chat:send', ({ text }, ack) => {
    try {
      if (!joinedRoom || !joinedPlayerId) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      addChatMessage(room, joinedPlayerId, text);
      ack?.({ ok: true });
      broadcast(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ack?.({ ok: false, error: message });
    }
  });

  socket.on('disconnect', () => {
    if (joinedRoom && joinedPlayerId) {
      const room = getRoom(joinedRoom);
      if (room) {
        const p = room.players.get(joinedPlayerId);
        if (p) p.connected = false;
        broadcast(room);
      }
    }
  });
});

const PORT = Number(process.env.PORT ?? 4000);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
