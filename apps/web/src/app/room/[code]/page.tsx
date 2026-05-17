'use client';

import { useEffect, useState, Fragment } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getName, getPlayerId, setName } from '@/lib/identity';
import { getSocket } from '@/lib/socket';
import { CardView } from '@/components/Card';
import { Opponents } from '@/components/Opponents';
import { MyPlayerCard } from '@/components/MyPlayerCard';
import { BiddingPanel } from '@/components/BiddingPanel';
import { CallPartnerPanel } from '@/components/CallPartnerPanel';
import { Chat } from '@/components/Chat';
import { ContractInfo } from '@/components/ContractInfo';
import type { Bid, Card, ChatMessage, PlayerView, RoomSnapshot, SeatIndex } from '@sgb/shared';
import { isLegalPlay } from '@sgb/shared';

const TRUMP_LABEL: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

interface AckResponse {
  ok: boolean;
  error?: string;
  snapshot?: RoomSnapshot;
}

interface GameAction {
  type: 'bid' | 'callPartner' | 'play';
  bid?: Bid | 'pass';
  card?: Card;
}

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
  const searchParams = useSearchParams();
  const code = params.code.toUpperCase();
  const isQuickStart = searchParams.get('quickstart') === 'true';
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [namePrompt, setNamePrompt] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [botsAdded, setBotsAdded] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 2000);
    return () => clearTimeout(timeout);
  }, [error]);

  // Handle quickstart: auto-add bots and start game
  useEffect(() => {
    if (!isQuickStart || !snapshot || botsAdded || snapshot.view) return;

    const userSeat = snapshot.players.find((p) => p.playerId === getPlayerId())?.seat;
    if (userSeat === undefined) {
      // User not yet seated, seat them in slot 0
      getSocket().emit('seat:take', { seat: 0 }, (resp: AckResponse) => {
        if (resp?.ok) {
          // Now add 3 bots to other seats
          setTimeout(() => {
            getSocket().emit('bot:add', { seat: 1, difficulty: 'smart' }, (r: AckResponse) => {
              getSocket().emit('bot:add', { seat: 2, difficulty: 'smart' }, (r: AckResponse) => {
                getSocket().emit('bot:add', { seat: 3, difficulty: 'smart' }, (r: AckResponse) => {
                  // Start game after all bots added
                  setTimeout(() => {
                    getSocket().emit('game:start', {}, (r: AckResponse) => {});
                  }, 500);
                });
              });
            });
          }, 500);
        }
      });
      setBotsAdded(true);
    }
  }, [isQuickStart, snapshot, botsAdded]);

  useEffect(() => {
    setShareUrl(typeof window !== 'undefined' ? window.location.href : '');
    const name = getName();

    if (!name) {
      setNeedsName(true);
      return;
    }

    const s = getSocket();
    const playerId = getPlayerId();

    function onState(snap: RoomSnapshot) {
      setSnapshot(snap);
    }

    function joinRoomWithRetry() {
      s.emit('room:join', { code, playerId, name }, (resp: AckResponse) => {
        if (!resp.ok) setError(resp.error || 'error');
        else if (resp.snapshot) {
          setSnapshot(resp.snapshot);
          setNeedsName(false);
        }
      });
    }

    function onConnect() {
      setIsConnected(true);
      joinRoomWithRetry();
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    s.on('room:state', onState);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    // Set initial connection state
    setIsConnected(s.connected);

    // Initial join
    joinRoomWithRetry();

    return () => {
      s.off('room:state', onState);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [code]);

  function emitAck(event: string, payload: unknown) {
    if (!isConnected) {
      setError('Reconnecting... please wait');
      return;
    }
    getSocket().emit(event, payload, (resp: AckResponse) => {
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
    function onState(snap: RoomSnapshot) {
      setSnapshot(snap);
    }
    s.on('room:state', onState);
    s.emit('room:join', { code, playerId, name: namePrompt.trim() }, (resp: AckResponse) => {
      if (!resp.ok) setError(resp.error || 'error');
      else if (resp.snapshot) setSnapshot(resp.snapshot);
    });
  }

  // Name prompt modal
  if (needsName) {
    return (
      <div className="min-h-screen bg-felt flex flex-col items-center justify-center gap-4 p-4">
        <div className="bg-felt border-2 border-wood-dark rounded-2xl p-8 w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-panel">Join Room {code}</h1>
          <p className="text-panel/70 text-sm">Enter your name to join</p>
          <input
            className="w-full bg-panel border-2 border-wood-dark rounded px-3 py-2 text-ink placeholder-ink/40"
            value={namePrompt}
            onChange={(e) => setNamePrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Your name"
            autoFocus
          />
          <button
            onClick={handleNameSubmit}
            className="w-full bg-wood-light hover:bg-wood text-ink font-semibold rounded py-2 border-2 border-wood-dark transition"
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
      <div className="min-h-screen bg-felt flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-wood-light border-t-gold rounded-full animate-spin"></div>
        <div className="text-panel font-semibold">Connecting to room {code}…</div>
      </div>
    );

  const mySeat = snapshot.players.find((p) => p.playerId === getPlayerId())?.seat;
  const seatedCount = new Set(snapshot.players.map((p) => p.seat).filter((s) => s !== undefined)).size;
  const names: Record<number, string> = {};
  for (const p of snapshot.players) if (p.seat !== undefined) names[p.seat] = p.name;

  const view = snapshot.view;

  return (
    <main className={`h-screen overflow-hidden flex flex-col bg-felt ${!view ? 'p-0' : 'p-0'}`}>
      {/* Connection Status */}
      {!isConnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-semibold z-50 max-w-md text-center flex items-center gap-2 justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Reconnecting…
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-semibold animate-fade-in-out z-50 max-w-md text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Header - only during lobby */}
      {!view && (
        <header className="bg-felt border-b-2 border-wood-dark flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 mb-2">
          <h1 className="text-2xl md:text-xl font-bold text-panel">
            Room <span className="tracking-widest">{code}</span>
          </h1>
          <div className="flex gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs bg-wood-light hover:bg-wood text-ink px-3 py-2 rounded transition border-2 border-wood-dark font-semibold"
            >
              {copied ? '✓ Copied' : 'Copy invite link'}
            </button>
          </div>
        </header>
      )}


      {!view ? (
        <div className="bg-felt flex-1 flex items-center justify-center">
          <Lobby
            mySeat={mySeat}
            players={snapshot.players}
            onSeat={(seat) => emitAck('seat:take', { seat })}
            onStart={() => emitAck('game:start', {})}
            canStart={seatedCount === 4}
            setError={setError}
          />
        </div>
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
  players: RoomSnapshot['players'];
  onSeat: (s: SeatIndex) => void;
  onStart: () => void;
  canStart: boolean;
  setError: (msg: string | null) => void;
}) {
  function handleAddBot(seat: SeatIndex) {
    getSocket().emit('bot:add', { seat, difficulty: 'smart' }, (resp: any) => {
      if (!resp?.ok) setError(resp?.error ?? 'error adding bot');
    });
  }

  function handleRemoveBot(playerId: string) {
    getSocket().emit('bot:remove', { playerId }, (resp: any) => {
      if (!resp?.ok) setError(resp?.error ?? 'error removing bot');
    });
  }

  return (
    <div className="space-y-4 md:space-y-6 text-center w-full max-w-2xl mx-auto px-4">
      <p className="text-panel text-sm md:text-base">Pick a seat. All 4 seats must be filled to start.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full">
        {[0, 1, 2, 3].map((s) => {
          const taken = players.find((p) => p.seat === s);
          const mine = mySeat === s;
          const isBot = taken?.name.startsWith('Bot');
          const isEmpty = !taken;
          return (
            <div key={s} className="space-y-1">
              <button
                disabled={!!taken && !mine}
                onClick={() => onSeat(s as SeatIndex)}
                className={`w-full p-2 md:p-3 rounded border-2 transition text-xs md:text-sm ${
                  mine ? 'bg-gold text-ink border-wood-dark' : taken ? 'bg-wood text-panel border-wood-dark' : 'bg-wood-light text-ink hover:bg-wood border-wood-dark'
                }`}
              >
                <div className="font-semibold">Seat {s}</div>
                <div className="text-xs opacity-80 truncate">{taken?.name ?? 'empty'}</div>
              </button>
              {isEmpty && !mine && (
                <button
                  onClick={() => handleAddBot(s as SeatIndex)}
                  className="w-full text-xs bg-panel hover:bg-wood-light text-ink rounded px-2 py-1 border border-wood-dark transition"
                >
                  + Bot
                </button>
              )}
              {taken && isBot && !mine && (
                <button
                  onClick={() => handleRemoveBot(taken.playerId)}
                  className="w-full text-xs bg-red-300 hover:bg-red-400 text-ink rounded px-2 py-1 border border-red-600 transition font-semibold"
                >
                  ✕ Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        disabled={!canStart}
        onClick={onStart}
        className="w-full bg-gold disabled:opacity-40 text-ink font-semibold rounded px-4 py-2 md:py-3 text-sm md:text-base border-2 border-wood-dark transition hover:bg-yellow-500"
      >
        Start game
      </button>
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
  onAction: (action: GameAction) => void;
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
    <div className="flex flex-col h-screen bg-cream overflow-hidden gap-0">
      {/* Opponents Row */}
      <Opponents view={view} names={names} />

      {/* Play/Bidding Area - shows user's played card or bidding info */}
      <div className="flex-1 bg-felt flex-shrink-0 min-h-0 flex items-center justify-center">
        {view.phase === 'play' && (
          <div className="flex justify-center">
            {(() => {
              const myPlayedCard = view.currentTrick?.cards.find((c) => c.seat === view.seat);
              return myPlayedCard ? (
                <CardView card={myPlayedCard.card} disabled small />
              ) : null;
            })()}
          </div>
        )}
      </div>

      {/* Desktop: My Player Card + Action Panel Row */}
      <div className="hidden md:flex bg-wood-light border-t-2 border-wood-dark px-2 py-2 gap-2 flex-shrink-0 items-stretch">
        {/* Player Profile Card */}
        <div className="w-1/3 flex-shrink-0 min-w-0">
          <MyPlayerCard view={view} name={myName} score={view.scores[view.seat]} tricksWon={tricksWon} displayTrick={view.currentTrick && view.currentTrick.cards.length > 0 ? view.currentTrick : view.lastCompletedTrick} />
        </div>

        {/* Action Panel + Toggles */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Chat Toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="text-xs font-semibold rounded px-2 py-1 bg-white text-ink border border-wood-dark hover:bg-gold hover:text-ink transition"
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
            {view.phase === 'play' && (
              <ContractInfo view={view} names={names} />
            )}
            {view.phase === 'scored' && (
              <button
                onClick={onNextDeal}
                className="w-full bg-white hover:bg-gold text-ink font-semibold rounded px-2 py-1 text-xs transition border border-wood-dark"
              >
                Next deal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Player Card */}
      <div className="md:hidden bg-wood-light border-t-2 border-wood-dark px-1 py-1 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <MyPlayerCard view={view} name={myName} score={view.scores[view.seat]} tricksWon={tricksWon} displayTrick={view.currentTrick && view.currentTrick.cards.length > 0 ? view.currentTrick : view.lastCompletedTrick} />
          </div>
          <button
            onClick={() => setShowChat(!showChat)}
            className="text-lg rounded px-2 py-1 bg-white text-ink border border-wood-dark hover:bg-gold transition flex-shrink-0"
          >
            💬
          </button>
        </div>
      </div>

      {/* Mobile: Action Panel below player card */}
      <div className="md:hidden bg-panel border-t-2 border-wood-dark px-2 py-2 flex-shrink-0 overflow-y-auto">
        {view.phase === 'bidding' && (
          <BiddingPanel view={view} onBid={(bid) => onAction({ type: 'bid', bid })} />
        )}
        {view.phase === 'callPartner' && (
          <CallPartnerPanel view={view} onCall={(card) => onAction({ type: 'callPartner', card })} />
        )}
        {view.phase === 'play' && (
          <ContractInfo view={view} names={names} />
        )}
        {view.phase === 'scored' && (
          <button
            onClick={onNextDeal}
            className="w-full bg-gold hover:bg-yellow-500 text-ink font-semibold rounded px-3 py-2 border-2 border-wood-dark transition"
          >
            Next deal
          </button>
        )}
      </div>

      {/* Hand Area */}
      {view.phase !== 'scored' && (
        <div className="bg-panel border-t border-wood-dark px-1 md:px-2 py-1 md:py-2 flex-shrink-0 min-h-0">
          <div className="flex gap-0.5 md:gap-1 justify-center h-full">
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
