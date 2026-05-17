'use client';
import type { PlayerView } from '@sgb/shared';

const SEAT_EMOJI = ['🧑', '👩', '🧔', '👱'] as const;

export function MyPlayerBadge({ view, name }: { view: PlayerView; name: string }) {
  const label = `${name}${view.dealer === view.seat ? ' (D)' : ''}`;

  return (
    <div className="bg-wood text-white rounded-md px-2.5 py-1.5 text-center font-semibold shadow-md flex flex-col items-center gap-1 min-w-24">
      <div className="text-lg">{SEAT_EMOJI[view.seat]}</div>
      <div className="text-xs md:text-sm">{label}</div>
      <div className="text-xs opacity-95">{view.myHand.length}🂠</div>
    </div>
  );
}
