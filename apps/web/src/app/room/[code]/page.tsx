'use client';

import { useEffect, useState, Fragment } from 'react';
import { useParams } from 'next/navigation';
import { getName, getPlayerId, setName } from '@/lib/identity';
import { getSocket } from '@/lib/socket';
import { CardView } from '@/components/Card';
import { Opponents } from '@/components/Opponents';
import { MyPlayerCard } from '@/components/MyPlayerCard';
import { BiddingPanel } from '@/components/BiddingPanel';
import { CallPartnerPanel } from '@/components/CallPartnerPanel';
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
    <main className={`h-screen overflow-hidden flex flex-col ${!view ? 'p-2 md:p-4' : 'p-0'}`}>
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-semibold animate-fade-in-out z-50 max-w-md text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Header - only during lobby */}
      {!view && (
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <h1 className="text-2xl md:text-xl font-bold text-ink">
            Room <span className="tracking-widest">{code}</span>
          </h1>
          <div className="flex gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs bg-panel hover:bg-wood-dark hover:text-white text-ink px-3 py-2 rounded transition border border-wood-dark font-semibold"
            >
              {copied ? '✓ Copied' : 'Copy invite link'}
            </button>
          </div>
        </header>
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
        <div className="flex-1 min-h-0 overflow-hidden">
          <GameUI
            view={view}
            names={names}
            messages={snapshot.messages}
            onAction={(action) => emitAck('action', action)}
            onNextDeal={() => emitAck('game:nextDeal', {})}
            onSendMessage={(text) => emitAck('chat:send', { text })}
          />
        </div>
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
  const [showChat, setShowChat] = useState(false);
  const myName = names[view.seat] || `Seat ${view.seat}`;

  // Calculate tricks won for this player
  const tricksWon = view.tricks?.filter(t => t.cards.some(c => c.seat === view.seat &&
    (() => {
      const led = t.cards[0].card.suit;
      const trump = view.contract?.trump || 'NT';
      let winner = t.cards[0].seat;
      let winningCard = t.cards[0].card;
      for (let i = 1; i < t.cards.length; i++) {
        const card = t.cards[i].card;
        if ((trump !== 'NT' && card.suit === trump && winningCard.suit !== trump) ||
            (card.suit === winningCard.suit && RANK_ORDER.indexOf(card.rank as any) > RANK_ORDER.indexOf(winningCard.rank as any))) {
          winner = t.cards[i].seat;
          winningCard = card;
        }
      }
      return winner === view.seat;
    })()
  )).length || 0;

  return (
    <div className="flex flex-col h-screen bg-wood-dark overflow-hidden gap-0">
      {/* Opponents Row */}
      <Opponents view={view} names={names} />

      {/* Bidding/Play Area */}
      <div className="flex-1 bg-felt flex-shrink-0 min-h-0 flex items-center justify-center">
        {view.phase === 'bidding' && (
          <div className="flex gap-4 flex-wrap justify-center">
            {view.bidHistory.map((bid, i) => (
              <div key={i} className="text-center">
                <div className="text-gold text-2xl font-bold">
                  {bid.bid === 'pass' ? 'Pass' : `${bid.bid.level}${TRUMP_LABEL[bid.bid.trump]}`}
                </div>
                <div className="text-xs text-panel">{names[bid.seat]}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Player Card + Action Panel Row */}
      <div className="bg-wood-light border-t border-gold px-1 py-1 flex gap-1 flex-shrink-0 items-stretch">
        {/* Player Profile Card - 1/3 width */}
        <div className="w-1/3 flex-shrink-0 min-w-0">
          <MyPlayerCard view={view} name={myName} score={view.scores[view.seat]} tricksWon={tricksWon} displayTrick={view.currentTrick && view.currentTrick.cards.length > 0 ? view.currentTrick : view.lastCompletedTrick} />
        </div>

        {/* Action Panel + Toggles - 2/3 width */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Chat Toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`text-xs font-semibold rounded px-2 py-1 transition ${showChat ? 'bg-gold text-wood-dark' : 'bg-panel text-ink border border-wood-dark hover:bg-gold hover:text-wood-dark'}`}
          >
            💬 Chat
          </button>

          {/* Action Panel */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {view.phase === 'bidding' && (
              <BiddingPanel view={view} onBid={(bid) => onAction({ type: 'bid', bid })} />
            )}
            {view.phase === 'callPartner' && (
              <CallPartnerPanel view={view} onCall={(card) => onAction({ type: 'callPartner', card })} />
            )}
            {view.phase === 'play' && view.contract && (
              <div className="bg-panel border border-wood-dark rounded p-2 text-center text-xs">
                <div className="text-wood font-bold">{view.contract.level}{TRUMP_LABEL[view.contract.trump]}</div>
                <div className="text-wood text-xs">{names[view.contract.declarer]}</div>
              </div>
            )}
            {view.phase === 'scored' && (
              <button
                onClick={onNextDeal}
                className="w-full bg-poker-green hover:bg-poker-green text-wood-dark font-semibold rounded px-2 py-1 text-xs transition"
              >
                Next deal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hand Area */}
      {view.phase !== 'scored' && (
        <div className="bg-panel border-t border-wood-dark px-1 py-1 flex-shrink-0 min-h-0">
          <div className="flex gap-1 justify-center h-full">
            {sortCards(view.myHand).map((c, i) => {
              const isMyTurn = view.phase === 'play' && view.turn === view.seat;
              const isLegal = isMyTurn && isLegalPlay(view.myHand, c, view.currentTrick, view.contract?.trump, view.trumpBroken);
              const isTrump = view.contract?.trump !== 'NT' && c.suit === view.contract?.trump;
              return (
                <div key={`${c.rank}${c.suit}${i}`} className={`w-[calc(100%/13)] flex justify-center ${isTrump ? 'ring-2 ring-red-500 rounded-sm' : ''}`}>
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
      )}

      {/* Chat Modal */}
      {showChat && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end overflow-hidden"
          onClick={() => setShowChat(false)}
        >
          <div
            className="bg-panel w-full rounded-t-2xl p-3 max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2">
              <Chat messages={messages} onSendMessage={onSendMessage} />
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="w-full bg-wood-dark hover:bg-wood text-white font-semibold rounded py-2 text-sm transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
