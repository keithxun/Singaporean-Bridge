'use client';
import type { PlayerView, SeatIndex } from '@sgb/shared';
import { CardView } from './Card';

const SEAT_EMOJI = ['🧑', '👩', '🧔', '👱'] as const;

export function MyPlayerCard({ view, name, displayTrick }: { view: PlayerView; name: string; displayTrick?: any }) {
  const label = `${name}${view.dealer === view.seat ? ' (D)' : ''}`;

  // Get this player's played card
  const myPlayedCard = displayTrick?.cards.find((c: any) => c.seat === view.seat);

  // Determine highlight color based on game state
  let bgColor = 'bg-[#D2B48C] text-green-900'; // default lighter brown
  if (view.phase === 'bidding' && view.turn === view.seat) {
    bgColor = 'bg-gold text-white'; // it's their turn to bid
  } else if (view.phase === 'play' && view.turn === view.seat) {
    bgColor = 'bg-gold text-white'; // it's their turn to play
  } else if (view.contract?.declarer === view.seat) {
    bgColor = 'bg-yellow-500 text-white'; // they are declarer
  } else if (view.contract && view.partnerSeatRevealed === view.seat) {
    bgColor = 'bg-cyan-500 text-white'; // they are partner
  }

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <div className={`${bgColor} rounded-md px-3 py-2 text-center font-semibold shadow-md min-w-24`}>
        <div className="text-lg mb-0.5">{SEAT_EMOJI[view.seat]}</div>
        <div className="text-xs md:text-sm">{label}</div>
        <div className="text-xs opacity-95">{view.myHand.length}🂠</div>
      </div>
      {/* Show card played this round */}
      {myPlayedCard && (
        <div className="flex flex-col items-center gap-1">
          <CardView card={myPlayedCard.card} disabled small />
          <div className="text-xs text-green-900 font-semibold">Played</div>
        </div>
      )}
    </div>
  );
}
