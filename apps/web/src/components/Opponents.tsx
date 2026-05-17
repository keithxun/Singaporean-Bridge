'use client';
import type { PlayerView, SeatIndex } from '@sgb/shared';
import { CardView } from './Card';

const SEAT_POS = ['bottom', 'left', 'top', 'right'] as const;
const SEAT_EMOJI = ['🧑', '👩', '🧔', '👱'] as const;

function relativePos(mySeat: SeatIndex, seat: SeatIndex) {
  const offset = ((seat - mySeat + 4) % 4) as 0 | 1 | 2 | 3;
  return SEAT_POS[offset];
}

export function Opponents({ view, names }: { view: PlayerView; names: Record<number, string> }) {
  const trick = view.currentTrick;
  const lastTrick = view.lastCompletedTrick;
  const displayTrick = trick && trick.cards.length > 0 ? trick : lastTrick;

  const opponents = [0, 1, 2, 3]
    .filter((s) => s !== view.seat)
    .map((s) => ({
      seat: s as SeatIndex,
      pos: relativePos(view.seat, s as SeatIndex),
    }))
    .sort((a, b) => ['left', 'top', 'right'].indexOf(a.pos) - ['left', 'top', 'right'].indexOf(b.pos));

  return (
    <div className="bg-felt px-2 py-3 space-y-2">
      {/* Opponent badges row */}
      <div className="flex justify-around gap-2">
        {opponents.map(({ seat: s }) => {
          const isTurn = view.turn === s;
          const isDeclarer = view.contract?.declarer === s;
          const isPartner = view.contract && view.partnerSeatRevealed === s;
          const isWinner = displayTrick?.winner === s;
          const label = `${names[s] || `Seat ${s}`}${view.dealer === s ? ' (D)' : ''}`;
          const bgColor =
            isWinner
              ? 'bg-orange-400 text-white'
              : isDeclarer
              ? 'bg-yellow-500 text-white'
              : isPartner
              ? 'bg-cyan-500 text-white'
              : isTurn
              ? 'bg-gold text-white'
              : 'bg-wood text-white';

          return (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className={`${bgColor} rounded-md px-2 py-1.5 text-center text-xs md:text-sm font-semibold shadow-md min-w-20`}>
                <div className="text-lg mb-0.5">{SEAT_EMOJI[s]}</div>
                <div className="text-xs md:text-sm">{label}</div>
                <div className="text-xs opacity-95">{view.handCounts[s]}🂠 {view.tricksWonBy[s]}✓</div>
              </div>
              {/* Played card for this opponent */}
              {displayTrick && (
                <div className="h-14 md:h-16 flex items-center justify-center">
                  {displayTrick.cards.find((c) => c.seat === s) ? (
                    <CardView card={displayTrick.cards.find((c) => c.seat === s)!.card} disabled small />
                  ) : (
                    <div className="w-10 h-14 opacity-30" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
