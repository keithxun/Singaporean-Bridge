'use client';
import type { PlayerView, SeatIndex } from '@sgb/shared';

const TRUMP_LABEL: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };
const SEAT_EMOJI = ['🧑', '👩', '🧔', '👱'] as const;

export function ContractInfo({
  view,
  names,
}: {
  view: PlayerView;
  names: Record<number, string>;
}) {
  if (!view.contract) return null;

  const declarerName = names[view.contract.declarer];
  const partnerName = view.partnerSeatRevealed !== undefined ? names[view.partnerSeatRevealed] : undefined;

  return (
    <div className="bg-panel border border-wood-dark rounded p-2 space-y-1">
      {/* Bid */}
      <div className="text-center text-xs font-bold text-wood">
        {view.contract.level}{TRUMP_LABEL[view.contract.trump]}
      </div>

      {/* Declarer */}
      <div className="text-center text-xs text-wood">
        <span className="text-lg">{SEAT_EMOJI[view.contract.declarer]}</span>
        <span className="font-semibold"> {declarerName}</span>
      </div>

      {/* Partner (if revealed) */}
      {partnerName && (
        <div className="text-center text-xs text-yellow-600 border-t border-wood-dark pt-1">
          <span className="font-semibold">Partner:</span>
          <span className="ml-1">
            <span className="text-lg">{SEAT_EMOJI[view.partnerSeatRevealed!]}</span> {partnerName}
          </span>
        </div>
      )}
    </div>
  );
}
