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
  const lastTrick = view.lastCompletedTrick;
  const displayTrick = trick && trick.cards.length > 0 ? trick : lastTrick;
  const seats: SeatIndex[] = [0, 1, 2, 3];

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Circle */}
      <div className="relative flex-1 aspect-square mx-auto bg-emerald-800/40 rounded-full border-2 border-emerald-700 w-full">
        {seats.map((s) => {
          const pos = relativePos(view.seat, s);
          const isTurn = view.turn === s;
          const isDeclarer = view.contract?.declarer === s;
          const isPartner = view.contract && view.partnerSeatRevealed === s;
          const isWinner = displayTrick?.winner === s;
          const label = `${names[s] || `Seat ${s}`}${view.dealer === s ? ' (D)' : ''}`;
          const posClass =
            pos === 'bottom'
              ? 'bottom-2 left-1/2 -translate-x-1/2'
              : pos === 'top'
              ? 'top-2 left-1/2 -translate-x-1/2'
              : pos === 'left'
              ? 'left-2 top-1/2 -translate-y-1/2'
              : 'right-2 top-1/2 -translate-y-1/2';
          const bgColor =
            isWinner
              ? 'bg-orange-400/80 text-emerald-950 ring-2 ring-orange-300'
              : isDeclarer
              ? 'bg-yellow-500/80 text-emerald-950 ring-2 ring-yellow-400'
              : isPartner
              ? 'bg-cyan-600/80 text-white'
              : isTurn
              ? 'bg-lime-400 text-emerald-950'
              : 'bg-emerald-950/70';
          return (
            <div key={s}>
              <div
                className={`absolute ${posClass} text-xs md:text-sm font-semibold px-2 py-1.5 rounded-md shadow-md ${bgColor}`}
              >
                <div className="text-xs md:text-sm">{label}</div>
                <div className="text-xs opacity-90">{view.handCounts[s]}🂠 {view.tricksWonBy[s]}✓</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Played Cards - Below the circle */}
      {displayTrick && displayTrick.cards.length > 0 && (
        <div className="flex justify-center gap-1 flex-wrap flex-shrink-0 min-h-0">
          {displayTrick.cards.map((playedCard) => (
            <div key={`${playedCard.seat}`} className="flex flex-col items-center gap-0.5">
              <CardView card={playedCard.card} disabled tiny animate />
              <div className="text-xs text-emerald-300 font-semibold text-center max-w-[40px] truncate">
                {names[playedCard.seat] || `Seat ${playedCard.seat}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
