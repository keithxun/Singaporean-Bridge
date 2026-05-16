'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getName, getPlayerId } from '@/lib/identity';
import { getSocket } from '@/lib/socket';
import { CardView } from '@/components/Card';
import { Table } from '@/components/Table';
import { BiddingPanel } from '@/components/BiddingPanel';
import { CallPartnerPanel } from '@/components/CallPartnerPanel';
import { TurnIndicator } from '@/components/TurnIndicator';
import { Chat } from '@/components/Chat';
import type { Bid, Card, ChatMessage, PlayerView, SeatIndex } from '@sgb/shared';
import { isLegalPlay } from '@sgb/shared';

interface Snapshot {
  code: string;
  players: { playerId: string; name: string; seat?: SeatIndex; connected: boolean }[];
  view?: PlayerView;
  messages: ChatMessage[];
}

const TRUMP_LABEL: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    setShareUrl(typeof window !== 'undefined' ? window.location.href : '');
    const s = getSocket();
    const playerId = getPlayerId();
    const name = getName() || 'Anonymous';

    function onState(snap: Snapshot) {
      setSnapshot(snap);
    }
    s.on('room:state', onState);

    s.emit('room:join', { code, playerId, name }, (resp: any) => {
      if (!resp.ok) setError(resp.error);
      else setSnapshot(resp.snapshot);
    });

    return () => {
      s.off('room:state', onState);
    };
  }, [code]);

  function emitAck(event: string, payload: any) {
    getSocket().emit(event, payload, (resp: any) => {
      if (!resp?.ok) setError(resp?.error ?? 'error');
      else setError(null);
    });
  }

  if (error)
    return (
      <div className="p-6 bg-red-950/50 border border-red-700 rounded max-w-md space-y-3">
        <div className="text-red-300">Error: {error}</div>
        <button
          onClick={() => setError(null)}
          className="text-xs bg-red-800 hover:bg-red-700 px-3 py-1 rounded"
        >
          Dismiss
        </button>
      </div>
    );
  if (!snapshot) return <div className="p-6">Connecting…</div>;

  const mySeat = snapshot.players.find((p) => p.playerId === getPlayerId())?.seat;
  const seatedCount = new Set(snapshot.players.map((p) => p.seat).filter((s) => s !== undefined)).size;
  const names: Record<number, string> = {};
  for (const p of snapshot.players) if (p.seat !== undefined) names[p.seat] = p.name;

  const view = snapshot.view;

  return (
    <main className="min-h-screen p-2 md:p-4 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="text-2xl md:text-xl font-bold">
          Room <span className="tracking-widest">{code}</span>
        </h1>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="text-xs bg-emerald-800 hover:bg-emerald-700 px-3 py-2 rounded self-start md:self-auto"
        >
          Copy invite link
        </button>
      </header>

      {!view ? (
        <Lobby
          mySeat={mySeat}
          players={snapshot.players}
          onSeat={(seat) => emitAck('seat:take', { seat })}
          onStart={() => emitAck('game:start', {})}
          canStart={seatedCount === 4}
          setError={setError}
        />
      ) : (
        <GameUI
          view={view}
          names={names}
          messages={snapshot.messages}
          onAction={(action) => emitAck('action', action)}
          onNextDeal={() => emitAck('game:nextDeal', {})}
          onSendMessage={(text) => emitAck('chat:send', { text })}
        />
      )}
    </main>
  );
}

function Lobby({
  mySeat,
  players,
  onSeat,
  onStart,
  canStart,
  setError,
}: {
  mySeat: SeatIndex | undefined;
  players: Snapshot['players'];
  onSeat: (s: SeatIndex) => void;
  onStart: () => void;
  canStart: boolean;
  setError: (msg: string | null) => void;
}) {
  const [botDifficulty, setBotDifficulty] = useState<'smart' | 'random'>('smart');

  function handleAddBot(seat: SeatIndex) {
    getSocket().emit('bot:add', { seat, difficulty: botDifficulty }, (resp: any) => {
      if (!resp?.ok) setError(resp?.error ?? 'error adding bot');
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-emerald-200 text-sm">Pick a seat. All 4 seats must be filled to start.</p>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        {[0, 1, 2, 3].map((s) => {
          const taken = players.find((p) => p.seat === s);
          const mine = mySeat === s;
          const isEmpty = !taken;
          return (
            <div key={s} className="space-y-1">
              <button
                disabled={!!taken && !mine}
                onClick={() => onSeat(s as SeatIndex)}
                className={`w-full p-3 rounded border ${
                  mine ? 'bg-emerald-500 text-emerald-950' : taken ? 'bg-emerald-800' : 'bg-emerald-900 hover:bg-emerald-700'
                }`}
              >
                <div className="font-semibold text-sm">Seat {s}</div>
                <div className="text-xs opacity-80">{taken?.name ?? 'empty'}</div>
              </button>
              {isEmpty && !mine && (
                <button
                  onClick={() => handleAddBot(s as SeatIndex)}
                  className="w-full text-xs bg-emerald-700 hover:bg-emerald-600 rounded px-2 py-1"
                >
                  + Bot
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col md:flex-row gap-2 md:gap-3 items-stretch">
        <label className="flex items-center gap-2 text-xs flex-1">
          <span className="text-emerald-300">Bot difficulty:</span>
          <select
            value={botDifficulty}
            onChange={(e) => setBotDifficulty(e.target.value as 'smart' | 'random')}
            className="bg-emerald-900 rounded px-2 py-1 flex-1"
          >
            <option value="smart">Smart</option>
            <option value="random">Random</option>
          </select>
        </label>
        <button
          disabled={!canStart}
          onClick={onStart}
          className="bg-amber-400 disabled:opacity-40 text-emerald-950 font-semibold rounded px-4 py-2 text-sm md:text-base"
        >
          Start game
        </button>
      </div>
    </div>
  );
}

function GameUI({
  view,
  names,
  messages,
  onAction,
  onNextDeal,
  onSendMessage,
}: {
  view: PlayerView;
  names: Record<number, string>;
  messages: ChatMessage[];
  onAction: (a: any) => void;
  onNextDeal: () => void;
  onSendMessage: (text: string) => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 h-full max-h-[calc(100vh-120px)]">
      {/* Left: Table + Hand + Actions */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Turn Indicator */}
        <TurnIndicator view={view} names={names} />

        {/* Trump Display */}
        {view.contract && (
          <div className="bg-red-950/70 border-2 border-red-600 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-red-300 font-semibold mb-1">TRUMP</div>
            <div className="text-3xl font-bold text-red-400">{TRUMP_LABEL[view.contract.trump]}</div>
            <div className="text-xs text-red-200 mt-1">
              {view.trumpBroken ? '✓ Broken' : '⚠ Not broken yet'}
            </div>
          </div>
        )}

        {/* Table - Center piece */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <Table view={view} names={names} />
        </div>

        {/* Hand Area - Compact */}
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <div className="text-xs text-slate-300 font-semibold mb-1">Your hand</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {view.myHand.map((c, i) => {
              const isMyTurn = view.phase === 'play' && view.turn === view.seat;
              const isLegal = isMyTurn && isLegalPlay(view.myHand, c, view.currentTrick, view.contract?.trump, view.trumpBroken);
              const isTrump = view.contract?.trump !== 'NT' && c.suit === view.contract?.trump;
              return (
                <div key={`${c.rank}${c.suit}${i}`} className={isTrump ? 'ring-2 ring-red-500 rounded' : ''}>
                  <CardView
                    card={c}
                    disabled={!isLegal}
                    small
                    onClick={isLegal ? () => onAction({ type: 'play', card: c }) : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Panels - Bidding/Calling */}
        {view.phase === 'bidding' && (
          <BiddingPanel view={view} onBid={(bid) => onAction({ type: 'bid', bid })} />
        )}
        {view.phase === 'callPartner' && (
          <CallPartnerPanel view={view} onCall={(card) => onAction({ type: 'callPartner', card })} />
        )}
      </div>

      {/* Right: Info + Chat Sidebar */}
      <div className="w-full lg:w-64 flex flex-col gap-3 min-w-0">
        {/* Contract Info */}
        <div className="bg-blue-950/70 border border-blue-700 rounded p-2 text-xs">
          <div className="font-semibold text-blue-300 mb-1">Phase & Contract</div>
          <div className="text-blue-100 space-y-1">
            <div>Phase: <span className="font-semibold">{view.phase}</span></div>
            {view.contract && (
              <>
                <div>
                  Bid: {view.contract.level}
                  {TRUMP_LABEL[view.contract.trump]} by {names[view.contract.declarer]}
                </div>
                <div>
                  Partner: {view.contract.partnerCard.rank}
                  {TRUMP_LABEL[view.contract.partnerCard.suit]}
                  {view.partnerSeatRevealed !== undefined && ` (${names[view.partnerSeatRevealed]})`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Scores */}
        <div className="bg-purple-950/70 border border-purple-700 rounded p-2 text-xs">
          <div className="font-semibold text-purple-300 mb-1">Scores</div>
          <div className="text-purple-100 space-y-0.5">
            {view.scores.map((score, i) => (
              <div key={i}>{names[i]}: <span className="font-semibold">{score}</span></div>
            ))}
          </div>
        </div>

        {/* Next Deal Button */}
        {view.phase === 'scored' && (
          <button
            onClick={onNextDeal}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold rounded px-3 py-2 text-sm w-full"
          >
            Next deal
          </button>
        )}

        {/* Chat - Bottom of sidebar */}
        <div className="flex-1 min-h-0">
          <Chat messages={messages} onSendMessage={onSendMessage} />
        </div>
      </div>
    </div>
  );
}
