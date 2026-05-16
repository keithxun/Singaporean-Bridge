'use client';
import { io, type Socket } from 'socket.io-client';
import { getServerUrl } from './identity';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getServerUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      rejectUnauthorized: false,
    });
  }
  return socket;
}
