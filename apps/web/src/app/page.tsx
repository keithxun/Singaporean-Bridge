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
    if (!name.trim() || !code.trim()) return setError('enter a name and room code');
    setName(name.trim());
    setServerUrl(server.trim());
    router.push(`/room/${code.trim().toUpperCase()}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-emerald-950/60 border border-emerald-800 rounded-2xl p-8 w-full max-w-md space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Singaporean Bridge</h1>
          <p className="text-emerald-200 text-sm">4 players · private rooms</p>
        </div>

        <div className="flex gap-2 border-b border-emerald-700">
          <button
            onClick={() => setTab('play')}
            className={`px-3 py-2 border-b-2 transition ${
              tab === 'play' ? 'border-emerald-400 text-emerald-400 font-semibold' : 'border-transparent text-emerald-300 hover:text-emerald-200'
            }`}
          >
            Play
          </button>
          <button
            onClick={() => setTab('rules')}
            className={`px-3 py-2 border-b-2 transition ${
              tab === 'rules' ? 'border-emerald-400 text-emerald-400 font-semibold' : 'border-transparent text-emerald-300 hover:text-emerald-200'
            }`}
          >
            Rules
          </button>
        </div>

        {tab === 'play' ? (
          <>
            <label className="block">
              <span className="text-sm">Your name</span>
              <input
                className="mt-1 w-full bg-emerald-900 border border-emerald-700 rounded px-3 py-2"
                value={name}
                onChange={(e) => setNameState(e.target.value)}
                placeholder="e.g. Keith"
              />
            </label>

            <label className="block">
              <span className="text-sm">Server URL</span>
              <input
                className="mt-1 w-full bg-emerald-900 border border-emerald-700 rounded px-3 py-2 text-sm"
                value={server}
                onChange={(e) => setServerState(e.target.value)}
              />
            </label>

            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={createRoom}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold rounded py-2"
              >
                Create room
              </button>
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-emerald-900 border border-emerald-700 rounded px-3 py-2 uppercase tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={4}
              />
              <button
                onClick={joinRoom}
                className="bg-emerald-700 hover:bg-emerald-600 rounded px-4 font-semibold"
              >
                Join
              </button>
            </div>

            {error && <p className="text-red-300 text-sm">{error}</p>}
          </>
        ) : (
          <RulesTab />
        )}
      </div>
    </main>
  );
}
