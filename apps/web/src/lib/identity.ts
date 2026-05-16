'use client';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  // sessionStorage: per-tab. Survives refresh, distinct across tabs/windows.
  let id = sessionStorage.getItem('sgb.playerId');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('sgb.playerId', id);
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
  const stored = localStorage.getItem('sgb.server');
  if (stored) return stored;
  // Production: NEXT_PUBLIC_SERVER_URL is baked in at build time.
  const envUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  if (envUrl) return envUrl;
  // Local dev fallback: same host as page, port 4000.
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000`;
}

export function setServerUrl(url: string): void {
  localStorage.setItem('sgb.server', url);
}
