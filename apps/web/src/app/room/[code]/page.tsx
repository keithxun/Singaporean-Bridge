'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getName, getPlayerId, setName } from '@/lib/identity';
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

const SUIT_ORDER = ['S', 'H', 'D', 'C'] as const;
const RANK_ORDER = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER.indexOf(a.suit as any) - SUIT_ORDER.indexOf(b.suit as any);
    if (suitDiff !== 0) return suitDiff;
    return RANK_ORDER.indexOf(a.rank as any) - RANK_ORDER.indexOf(b.rank as any);
  });
}

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [namePrompt, setNamePrompt] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 2000);
    return () => clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    setShareUrl(typeof window !== 'undefined' ? window.location.href : '');
    const name = getName();

    if (!name) {
      // Prompt for name if not set (e.g., joining via invite link)
      setNeedsName(true);
      return;
    }

    const s = getSocket();
    const playerId = getPlayerId();

    function onState(snap: Snapshot) {
      setSnapshot(snap);
    }
    s.on('room:state', onState);

    s.emit('room:join', { code, playerId, name }, (resp: any) => {
      if (!resp.ok) setError(resp.error);
      else {
        setSnapshot(resp.snapshot);
        setNeedsName(false);
      }
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

  function handleNameSubmit() {
    if (!namePrompt.trim()) {
      setError('enter a name');
      return;
    }
    setName(namePrompt.trim());
    setNeedsName(false);
    // Trigger re-join with new name
    const s = getSocket();
    const playerId = getPlayerId();
    function onState(snap: Snapshot) {
      setSnapshot(snap);
    }
    s.on('room:state', onState);
    s.emit('room:join', { code, playerId, name: namePrompt.trim() }, (resp: any) => {
      if (!resp.ok) setError(resp.error);
      else setSnapshot(resp.snapshot);
    });
  }

  // Name prompt modal
  if (needsName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="bg-emerald-950/60 border border-emerald-800 rounded-2xl p-8 w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Join Room {code}</h1>
          <p className="text-emerald-200 text-sm">Enter your name to join</p>
          <input
            className="w-full bg-emerald-900 border border-emerald-700 rounded px-3 py-2"
            value={namePrompt}
            onChange={(e) => setNamePrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Your name"
            autoFocus
          />
          <button
            onClick={handleNameSubmit}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold rounded py-2"
          >
            Join
          </button>
          {error && <p className="text-red-300 text-sm text-center">{error}</p>}
        </div>
      </div>
    );
  }

  if (!snapshot)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-700 border-t-emerald-400 rounded-full animate-spin"></div>
        <div className="text-emerald-300 font-semibold">Connecting to room {code}…</div>
      </div>
    );

  const mySeat = snapshot.players.find((p) => p.playerId === getPlayerId())?.seat;
  const seatedCount = new Set(snapshot.players.map((p) => p.seat).filter((s) => s !== undefined)).size;
  const names: Record<number, string> = {};
  for (const p of snapshot.players) if (p.seat !== undefined) names[p.seat] = p.name;

  const view = snapshot.view;

  return (
    <main className="min-h-screen p-2 md:p-4 space-y-4">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-semibold animate-fade-in-out z-50 max-w-md text-center">
          ⚠️ {error}
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="text-2xl md:text-xl font-bold">
          Room <span className="tracking-widest">{code}</span>
        </h1>
        <div className="flex gap-2 self-start md:self-auto">
          {view && (
            <button
              onClick={() => setShowStats(!showStats)}
              className={`text-xs px-3 py-2 rounded font-semibold transition ${
                showStats ? 'bg-purple-600 text-white' : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-200'
              }`}
            >
              📊 Stats
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="text-xs bg-emerald-800 hover:bg-emerald-700 px-3 py-2 rounded transition"
          >
            {copied ? '✓ Copied' : 'Copy invite link'}
          </button>
        </div>
      </header>

      {/* Stats Panel */}
      {showStats && view && (
        <div className="bg-purple-950/70 border border-purple-700 rounded-lg p-3 text-xs">
          <div className="font-semibold text-purple-300 mb-2 text-sm">Room Scores</div>
          <div className="text-purple-100 space-y-1.5">
            {view.scores.map((score, i) => (
              <div key={i} className="flex justify-between items-center">
                <span>{names[i]}</span>
                <span className="font-bold text-lg text-purple-300">{score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <>
          <GameUI
            view={view}
            names={names}
            messages={snapshot.messages}
            onAction={(action) => emitAck('action', action)}
            onNextDeal={() => emitAck('game:nextDeal', {})}
            onSendMessage={(text) => emitAck('chat:send', { text })}
          />
          {/* Mobile Chat Bar */}
          <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-emerald-950/95 border-t border-emerald-700 p-2">
            <Chat messages={snapshot.messages} onSendMessage={(text) => emitAck('chat:send', { text })} />
          </div>
        </>
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
    <div className="flex flex-col lg:flex-row gap-2 md:gap-3 h-full max-h-[calc(100vh-120px)]">
      {/* Left: Table + Hand + Actions */}
      <div className="flex-1 flex flex-col gap-2 md:gap-3 min-w-0 min-h-0 pb-40 lg:pb-0 overflow-y-auto">
        {/* Turn Indicator */}
        <TurnIndicator view={view} names={names} />

        {/* Contract Banner (Mobile) */}
        {view.contract && (
          <div className="lg:hidden bg-blue-900/60 border border-blue-600 rounded px-3 py-2 text-center">
            <div className="text-xs text-blue-300">Contract</div>
            <div className="text-sm font-bold text-blue-100">
              {view.contract.level}{TRUMP_LABEL[view.contract.trump]} by {names[view.contract.declarer]}
              <span className="text-xs text-blue-300 ml-2">({6 + view.contract.level} tricks)</span>
            </div>
          </div>
        )}

        {/* Table - Center piece */}
        <div className="flex items-center justify-center px-1 md:px-2 flex-shrink-0">
          <div className="h-56 sm:h-64 md:h-72 w-56 sm:w-64 md:w-72">
            <Table view={view} names={names} />
          </div>
        </div>

        {/* Hand Area - Compact */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-2 md:p-3">
          <div className="text-xs md:text-sm text-slate-300 font-semibold mb-2 uppercase tracking-wider">Your hand ({view.myHand.length})</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {sortCards(view.myHand).map((c, i) => {
              const isMyTurn = view.phase === 'play' && view.turn === view.seat;
              const isLegal = isMyTurn && isLegalPlay(view.myHand, c, view.currentTrick, view.contract?.trump, view.trumpBroken);
              const isTrump = view.contract?.trump !== 'NT' && c.suit === view.contract?.trump;
              return (
                <div key={`${c.rank}${c.suit}${i}`} className={isTrump ? 'ring-2 ring-red-500 rounded-sm' : ''}>
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

      {/* Right: Info + Chat Sidebar (desktop only) */}
      <div className="hidden lg:flex w-80 flex-col gap-2 min-h-0 lg:min-h-full">
        {/* Contract Info */}
        <div className="bg-blue-950/70 border border-blue-700 rounded-lg p-2 md:p-3 text-xs">
          <div className="font-semibold text-blue-300 mb-2 text-sm">Phase & Contract</div>
          <div className="text-blue-100 space-y-1.5 text-xs md:text-sm">
            <div>Phase: <span className="font-bold text-blue-300">{view.phase}</span></div>
            {view.contract && (
              <>
                <div>
                  <div className="text-blue-300 font-semibold">Bid</div>
                  <div className="text-blue-100">{view.contract.level}{TRUMP_LABEL[view.contract.trump]} by {names[view.contract.declarer]}</div>
                </div>
                <div>
                  <div className="text-blue-300 font-semibold">Partner</div>
                  <div className="text-blue-100 text-xs">{view.contract.partnerCard.rank}{TRUMP_LABEL[view.contract.partnerCard.suit]}{view.partnerSeatRevealed !== undefined && ` • ${names[view.partnerSeatRevealed]}`}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Trump Display */}
        {view.contract && (
          <div className="bg-red-950/70 border-2 border-red-600 rounded-lg p-2 md:p-3 text-center">
            <div className="text-xs text-red-300 font-semibold mb-1">TRUMP</div>
            <div className="text-3xl md:text-4xl font-bold text-red-400 mb-1">{TRUMP_LABEL[view.contract.trump]}</div>
            <div className="text-xs font-semibold">
              <span className={view.trumpBroken ? 'text-green-400' : 'text-yellow-400'}>
                {view.trumpBroken ? '✓ Broken' : '⚠ Not broken'}
              </span>
            </div>
          </div>
        )}

        {/* Scores */}
        <div className="bg-purple-950/70 border border-purple-700 rounded-lg p-2 md:p-3 text-xs">
          <div className="font-semibold text-purple-300 mb-2 text-sm">Scores</div>
          <div className="text-purple-100 space-y-1 md:space-y-1.5 text-xs md:text-sm">
            {view.scores.map((score, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="truncate">{names[i]}</span>
                <span className="font-bold text-purple-300 ml-2">{score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Deal Button */}
        {view.phase === 'scored' && (
          <button
            onClick={onNextDeal}
            className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 font-semibold rounded-lg px-3 py-2 md:px-4 md:py-3 text-sm w-full transition flex-shrink-0"
          >
            → Next deal
          </button>
        )}

        {/* Chat - Bottom of sidebar */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Chat messages={messages} onSendMessage={onSendMessage} />
        </div>
      </div>
    </div>
  );
}
