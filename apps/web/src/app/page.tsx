'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getName, getServerUrl, setName, setServerUrl } from '@/lib/identity';
import { RulesTab } from '@/components/RulesTab';

export default function Home() {
  const router = useRouter();
  const [name, setNameState] = useState('');
  const [code, setCode] = useState('');
  const [server, setServerState] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'play' | 'rules'>('play');

  useEffect(() => {
    setNameState(getName());
    setServerState(getServerUrl());
  }, []);

  async function createRoom() {
    if (!name.trim()) return setError('enter a name first');
    setBusy(true);
    setError(null);
    try {
      setName(name.trim());
      setServerUrl(server.trim());
      const res = await fetch(`${server.trim()}/rooms`, { method: 'POST' });
      const { code } = await res.json();
      router.push(`/room/${code}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function joinRoom() {
    if (!name.trim()) return setError('enter your name');
    if (!code.trim()) return setError('enter a room code');
    setName(name.trim());
    if (server.trim()) setServerUrl(server.trim());
    router.push(`/room/${code.trim().toUpperCase()}`);
  }

  async function quickStartWithBots() {
    const testName = 'Tester';
    setBusy(true);
    setError(null);
    try {
      setName(testName);
      setServerUrl(server.trim());
      const res = await fetch(`${server.trim()}/rooms`, { method: 'POST' });
      const { code } = await res.json();
      router.push(`/room/${code}?quickstart=true`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-ink">Singaporean Bridge</h1>
          <p className="text-ink/70 text-sm">4 players · private rooms</p>
        </div>

        {/* Name Input */}
        <label className="block">
          <input
            className="w-full bg-white border-2 border-wood-dark rounded px-4 py-3 text-ink placeholder-ink/40 font-medium"
            value={name}
            onChange={(e) => setNameState(e.target.value)}
            placeholder="Your name"
          />
        </label>

        {/* Server URL (smaller, secondary) */}
        <label className="block">
          <input
            className="w-full bg-panel border-2 border-wood-dark rounded px-4 py-2 text-ink/80 placeholder-ink/40 text-sm"
            value={server}
            onChange={(e) => setServerState(e.target.value)}
            placeholder="Server URL (optional)"
          />
        </label>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Create Room Button */}
          <button
            disabled={busy}
            onClick={createRoom}
            className="w-full bg-white text-ink border-3 border-wood-dark font-bold rounded py-3 hover:bg-panel transition disabled:opacity-50"
          >
            Create Room
          </button>

          {/* Quick Start Button */}
          <button
            disabled={busy}
            onClick={quickStartWithBots}
            className="w-full bg-gold text-ink border-3 border-wood-dark font-bold rounded py-3 hover:bg-yellow-400 transition disabled:opacity-50"
          >
            Quick Test (3 Bots)
          </button>

          {/* Join Room Section */}
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white border-2 border-wood-dark rounded px-4 py-2 text-ink uppercase tracking-widest placeholder-ink/40 font-bold text-center"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={4}
            />
            <button
              onClick={joinRoom}
              className="px-6 bg-wood hover:bg-wood-dark text-white font-bold rounded transition"
            >
              Join
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-600 text-sm font-semibold text-center">{error}</p>}

        {/* Rules Collapsible */}
        <div className="border-t border-wood-dark/30 pt-4">
          <button
            onClick={() => setTab(tab === 'play' ? 'rules' : 'play')}
            className="text-sm font-semibold text-ink/70 hover:text-ink transition"
          >
            {tab === 'play' ? '📖 View Rules' : '← Back to Play'}
          </button>
          {tab === 'rules' && <RulesTab />}
        </div>
      </div>
    </main>
  );
}
