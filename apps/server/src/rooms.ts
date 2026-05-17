import {
  applyBid,
  callPartner,
  playCard,
  startGame,
  viewFor,
  type BidAction,
  type Card,
  type GameState,
  type PlayerView,
  type RoomSnapshot,
  type SeatIndex,
} from '@sgb/shared';

export interface Player {
  playerId: string;
  name: string;
  seat?: SeatIndex;
  connected: boolean;
  isBot?: boolean;
  botDifficulty?: 'smart' | 'random';
}

export interface ChatMessage {
  playerId: string;
  name: string;
  text: string;
  timestamp: number;
}

export interface Room {
  code: string;
  players: Map<string, Player>; // by playerId
  game?: GameState;
  dealerRotation: SeatIndex;
  createdAt: number;
  messages: ChatMessage[]; // chat history
}

const rooms = new Map<string, Room>();

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genCode(): string {
  let c = '';
  for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

export function createRoom(): Room {
  let code = genCode();
  while (rooms.has(code)) code = genCode();
  const room: Room = {
    code,
    players: new Map(),
    dealerRotation: 0,
    createdAt: Date.now(),
    messages: [],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(room: Room, playerId: string, name: string): Player {
  let p = room.players.get(playerId);
  if (p) {
    p.name = name || p.name;
    p.connected = true;
    return p;
  }
  p = { playerId, name, connected: true };
  room.players.set(playerId, p);
  return p;
}

export function takeSeat(room: Room, playerId: string, seat: SeatIndex): void {
  if (room.game) throw new Error('game already started');
  const player = room.players.get(playerId);
  if (!player) throw new Error('unknown player');
  for (const p of room.players.values()) {
    if (p.seat === seat && p.playerId !== playerId) throw new Error('seat taken');
  }
  player.seat = seat;
}

export function addBot(room: Room, seat: SeatIndex, difficulty: 'smart' | 'random' = 'smart'): void {
  if (room.game) throw new Error('game already started');
  for (const p of room.players.values()) {
    if (p.seat === seat) throw new Error('seat taken');
  }
  const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const bot: Player = {
    playerId: botId,
    name: `Bot (${difficulty})`,
    seat,
    connected: true,
    isBot: true,
    botDifficulty: difficulty,
  };
  room.players.set(botId, bot);
}

export function removeBot(room: Room, playerId: string): void {
  if (room.game) throw new Error('game already started');
  const player = room.players.get(playerId);
  if (!player) throw new Error('player not found');
  if (!player.isBot) throw new Error('can only remove bots');
  room.players.delete(playerId);
}

export function allSeated(room: Room): boolean {
  const seats = new Set<number>();
  for (const p of room.players.values()) {
    if (p.seat !== undefined) seats.add(p.seat);
  }
  return seats.size === 4;
}

export function startRoomGame(room: Room): void {
  if (!allSeated(room)) throw new Error('need 4 seated players');
  room.game = startGame(room.dealerRotation);
}

export function startNextDeal(room: Room): void {
  if (!allSeated(room)) throw new Error('need 4 seated players');
  room.dealerRotation = ((room.dealerRotation + 1) % 4) as SeatIndex;
  const prevScores = room.game?.scores ?? [0, 0, 0, 0];
  room.game = startGame(room.dealerRotation);
  room.game.scores = [...prevScores] as [number, number, number, number];
}

export function seatOfPlayer(room: Room, playerId: string): SeatIndex | undefined {
  return room.players.get(playerId)?.seat;
}

export function applyAction(
  room: Room,
  playerId: string,
  action:
    | { type: 'bid'; bid: BidAction['bid'] }
    | { type: 'callPartner'; card: Card }
    | { type: 'play'; card: Card }
): void {
  if (!room.game) throw new Error('no game in progress');
  const seat = seatOfPlayer(room, playerId);
  if (seat === undefined) throw new Error('not seated');
  if (action.type === 'bid') {
    room.game = applyBid(room.game, { seat, bid: action.bid });
  } else if (action.type === 'callPartner') {
    room.game = callPartner(room.game, seat, action.card);
  } else if (action.type === 'play') {
    room.game = playCard(room.game, seat, action.card);
  }
}

export function addChatMessage(room: Room, playerId: string, text: string): void {
  const player = room.players.get(playerId);
  if (!player) throw new Error('unknown player');
  const msg: ChatMessage = {
    playerId,
    name: player.name,
    text: text.trim().slice(0, 200), // limit length
    timestamp: Date.now(),
  };
  room.messages.push(msg);
  // Keep only last 50 messages
  if (room.messages.length > 50) room.messages.shift();
}

export function snapshotFor(room: Room, playerId: string): RoomSnapshot {
  const players = Array.from(room.players.values()).map((p) => ({
    playerId: p.playerId,
    name: p.name,
    seat: p.seat,
    connected: p.connected,
  }));
  const seat = seatOfPlayer(room, playerId);
  const view = room.game && seat !== undefined ? viewFor(room.game, seat) : undefined;
  return { code: room.code, players, view, messages: room.messages };
}
