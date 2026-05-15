import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  applyAction,
  createRoom,
  getRoom,
  joinRoom,
  snapshotFor,
  startNextDeal,
  startRoomGame,
  takeSeat,
  type Room,
} from './rooms.js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigin: any = ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS;

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
    } catch (e: any) {
      ack?.({ ok: false, error: e.message });
    }
  });

  socket.on('seat:take', ({ seat }, ack) => {
    try {
      if (!joinedRoom || !joinedPlayerId) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      takeSeat(room, joinedPlayerId, seat);
      ack?.({ ok: true });
      broadcast(room);
    } catch (e: any) {
      ack?.({ ok: false, error: e.message });
    }
  });

  socket.on('game:start', (_payload, ack) => {
    try {
      if (!joinedRoom) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      startRoomGame(room);
      ack?.({ ok: true });
      broadcast(room);
    } catch (e: any) {
      ack?.({ ok: false, error: e.message });
    }
  });

  socket.on('game:nextDeal', (_payload, ack) => {
    try {
      if (!joinedRoom) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      startNextDeal(room);
      ack?.({ ok: true });
      broadcast(room);
    } catch (e: any) {
      ack?.({ ok: false, error: e.message });
    }
  });

  socket.on('action', (action, ack) => {
    try {
      if (!joinedRoom || !joinedPlayerId) throw new Error('not in room');
      const room = getRoom(joinedRoom)!;
      applyAction(room, joinedPlayerId, action);
      ack?.({ ok: true });
      broadcast(room);
    } catch (e: any) {
      ack?.({ ok: false, error: e.message });
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
  console.log(`[sgb] server listening on http://0.0.0.0:${PORT}`);
});
