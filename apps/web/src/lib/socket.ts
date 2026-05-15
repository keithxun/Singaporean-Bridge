'use client';
import { io, type Socket } from 'socket.io-client';
import { getServerUrl } from './identity';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getServerUrl(), { transports: ['websocket', 'polling'] });
  }
  return socket;
}
