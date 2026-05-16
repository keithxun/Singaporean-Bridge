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
import type { Bid, Card, PlayerView, SeatIndex } from '@sgb/shared';
import { isLegalPlay } from '@sgb/shared';

interface Snapshot {
  code: string;
  players: { playerId: string; name: string; seat?: SeatIndex; connected: boolean }[];
  view?: PlayerView;
}

const TRUMP_LABEL: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');

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

  if (error) return <div className="p-6 text-red-300">Error: {error}</div>;
  if (!snapshot) return <div className="p-6">Connecting…</div>;

  const mySeat = snapshot.players.find((p) => p.playerId === getPlayerId())?.seat;
  const seatedCount = new Set(snapshot.players.map((p) => p.seat).filter((s) => s !== undefined)).size;
  const names: Record<number, string> = {};
  for (const p of snapshot.players) if (p.seat !== undefined) names[p.seat] = p.name;

  const view = snapshot.view;

  return (
    <main className="min-h-screen p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Room <span className="tracking-widest">{code}</span>
        </h1>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="text-xs bg-emerald-800 px-3 py-1 rounded"
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
        />
      ) : (
        <GameUI
          view={view}
          names={names}
          onAction={(action) => emitAck('action', action)}
          onNextDeal={() => emitAck('game:nextDeal', {})}
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
}: {
  mySeat: SeatIndex | undefined;
  players: Snapshot['players'];
  onSeat: (s: SeatIndex) => void;
  onStart: () => void;
  canStart: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-emerald-200 text-sm">Pick a seat. All 4 seats must be filled to start.</p>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        {[0, 1, 2, 3].map((s) => {
          const taken = players.find((p) => p.seat === s);
          const mine = mySeat === s;
          return (
            <button
              key={s}
              disabled={!!taken && !mine}
              onClick={() => onSeat(s as SeatIndex)}
              className={`p-4 rounded border ${
                mine ? 'bg-emerald-500 text-emerald-950' : taken ? 'bg-emerald-800' : 'bg-emerald-900 hover:bg-emerald-700'
              }`}
            >
              <div className="font-semibold">Seat {s}</div>
              <div className="text-sm opacity-80">{taken?.name ?? 'empty'}</div>
            </button>
          );
        })}
      </div>
      <button
        disabled={!canStart}
        onClick={onStart}
        className="bg-amber-400 disabled:opacity-40 text-emerald-950 font-semibold rounded px-4 py-2"
      >
        Start game
      </button>
    </div>
  );
}

function GameUI({
  view,
  names,
  onAction,
  onNextDeal,
}: {
  view: PlayerView;
  names: Record<number, string>;
  onAction: (a: any) => void;
  onNextDeal: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm">
        Phase: <span className="font-semibold">{view.phase}</span>
        {view.contract && (
          <span className="ml-3">
            Contract: {view.contract.level}
            {TRUMP_LABEL[view.contract.trump]} by seat {view.contract.declarer} · partner: {view.contract.partnerCard.rank}
            {TRUMP_LABEL[view.contract.partnerCard.suit]}
            {view.partnerSeatRevealed !== undefined && ` (seat ${view.partnerSeatRevealed})`}
          </span>
        )}
      </div>

      <TurnIndicator view={view} names={names} />

      <Table view={view} names={names} />

      {view.phase === 'bidding' && (
        <BiddingPanel view={view} onBid={(bid) => onAction({ type: 'bid', bid })} />
      )}
      {view.phase === 'callPartner' && (
        <CallPartnerPanel view={view} onCall={(card) => onAction({ type: 'callPartner', card })} />
      )}

      <div>
        <div className="text-xs text-emerald-300 mb-1">Your hand</div>
        <div className="flex flex-wrap gap-1">
          {view.myHand.map((c, i) => {
            const isMyTurn = view.phase === 'play' && view.turn === view.seat;
            const isLegal = isMyTurn && isLegalPlay(view.myHand, c, view.currentTrick);
            return (
              <CardView
                key={`${c.rank}${c.suit}${i}`}
                card={c}
                disabled={!isLegal}
                onClick={isLegal ? () => onAction({ type: 'play', card: c }) : undefined}
              />
            );
          })}
        </div>
      </div>

      <div className="text-sm bg-emerald-950/70 rounded p-3">
        Scores · {view.scores.map((s, i) => `s${i}:${s}`).join(' · ')}
      </div>

      {view.phase === 'scored' && (
        <button onClick={onNextDeal} className="bg-emerald-500 text-emerald-950 font-semibold rounded px-4 py-2">
          Next deal
        </button>
      )}
    </div>
  );
}
