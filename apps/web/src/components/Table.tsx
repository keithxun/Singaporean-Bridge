'use client';
import type { PlayerView, SeatIndex } from '@sgb/shared';
import { CardView } from './Card';

const SEAT_POS = ['bottom', 'left', 'top', 'right'] as const;

function relativePos(mySeat: SeatIndex, seat: SeatIndex) {
  const offset = ((seat - mySeat + 4) % 4) as 0 | 1 | 2 | 3;
  return SEAT_POS[offset];
}

export function Table({ view, names }: { view: PlayerView; names: Record<number, string> }) {
  const trick = view.currentTrick;
  const seats: SeatIndex[] = [0, 1, 2, 3];
  return (
    <div className="relative w-full max-w-sm md:max-w-2xl aspect-square mx-auto bg-emerald-800/40 rounded-full border-2 md:border-4 border-emerald-700">
      {seats.map((s) => {
        const pos = relativePos(view.seat, s);
        const played = trick?.cards.find((c) => c.seat === s);
        const isTurn = view.turn === s;
        const isDeclarer = view.contract?.declarer === s;
        const isPartner = view.contract && view.partnerSeatRevealed === s;
        const label = `${names[s] || `Seat ${s}`}${view.dealer === s ? ' (D)' : ''}`;
        const posClass =
          pos === 'bottom'
            ? 'bottom-2 left-1/2 -translate-x-1/2'
            : pos === 'top'
            ? 'top-2 left-1/2 -translate-x-1/2'
            : pos === 'left'
            ? 'left-2 top-1/2 -translate-y-1/2'
            : 'right-2 top-1/2 -translate-y-1/2';
        const cardPosClass =
          pos === 'bottom'
            ? 'bottom-24 left-1/2 -translate-x-1/2'
            : pos === 'top'
            ? 'top-24 left-1/2 -translate-x-1/2'
            : pos === 'left'
            ? 'left-24 top-1/2 -translate-y-1/2'
            : 'right-24 top-1/2 -translate-y-1/2';
        const bgColor =
          isDeclarer
            ? 'bg-yellow-500/80 text-emerald-950 ring-2 ring-yellow-400'
            : isPartner
            ? 'bg-cyan-600/80 text-white'
            : isTurn
            ? 'bg-lime-400 text-emerald-950'
            : 'bg-emerald-950/70';
        return (
          <div key={s}>
            <div
              className={`absolute ${posClass} text-xs font-medium px-2 py-1 rounded ${bgColor}`}
            >
              {label} · {view.handCounts[s]} cards · won {view.tricksWonBy[s]}
            </div>
            {played && (
              <div className={`absolute ${cardPosClass}`}>
                <CardView card={played.card} disabled small animate />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
