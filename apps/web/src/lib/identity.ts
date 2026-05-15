'use client';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('sgb.playerId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('sgb.playerId', id);
  }
  return id;
}

export function getName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('sgb.name') ?? '';
}

export function setName(name: string): void {
  localStorage.setItem('sgb.name', name);
}

export function getServerUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  // Allow override via query param ?server=... or stored value.
  const stored = localStorage.getItem('sgb.server');
  if (stored) return stored;
  // Default: same host as page, port 4000.
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000`;
}

export function setServerUrl(url: string): void {
  localStorage.setItem('sgb.server', url);
}
