'use client';
import type { PlayerView, SeatIndex, Trick } from '@sgb/shared';
import { CardView } from './Card';

const SEAT_EMOJI = ['🧑', '👩', '🧔', '👱'] as const;

export function MyPlayerCard({
  view,
  name,
  displayTrick,
  tricksWon,
  score,
}: {
  view: PlayerView;
  name: string;
  displayTrick?: Trick;
  tricksWon?: number;
  score?: number;
}) {
  const label = `${name}${view.dealer === view.seat ? '(D)' : ''}`;

  // Get this player's played card
  const myPlayedCard = displayTrick?.cards.find((c) => c.seat === view.seat);

  // Determine highlight color based on game state
  let bgColor = 'bg-wood-light text-ink'; // default
  if (view.phase === 'bidding' && view.turn === view.seat) {
    bgColor = 'bg-gold text-ink'; // it's their turn to bid
  } else if (view.phase === 'play' && view.turn === view.seat) {
    bgColor = 'bg-gold text-ink'; // it's their turn to play
  } else if (view.contract?.declarer === view.seat) {
    bgColor = 'bg-gold text-ink'; // they are declarer
  } else if (view.contract && view.partnerSeatRevealed === view.seat) {
    bgColor = 'bg-yellow-500 text-ink'; // they are partner
  }

  return (
    <div className="flex flex-col h-full gap-1">
      <div className={`${bgColor} rounded px-2 py-1 text-center font-semibold shadow-sm flex-1 flex flex-col justify-center`}>
        <div className="flex items-center justify-center gap-1">
          <span className="text-lg">{SEAT_EMOJI[view.seat]}</span>
          <div className="text-left min-w-0 flex-1">
            <div className="text-xs truncate font-bold">{label}</div>
            <div className="text-xs opacity-90 flex gap-1">
              {score !== undefined && <span>Score: {score}</span>}
              {tricksWon !== undefined && <span>♦{tricksWon}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
