'use client';
import type { PlayerView, SeatIndex } from '@sgb/shared';

const TRUMP_LABEL: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };
const SEAT_EMOJI = ['🧑', '👩', '🧔', '👱'] as const;
const RANK_DISPLAY: Record<string, string> = { '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
const SUIT_DISPLAY: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠' };

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
  const partnerCardDisplay = view.contract.partnerCard
    ? `${RANK_DISPLAY[view.contract.partnerCard.rank]}${SUIT_DISPLAY[view.contract.partnerCard.suit]}`
    : '?';

  return (
    <div className="bg-panel border border-wood-dark rounded p-2 space-y-1">
      {/* Bid + Declarer in one line */}
      <div className="text-center text-xs font-semibold text-wood">
        {view.contract.level}{TRUMP_LABEL[view.contract.trump]}, {declarerName}
      </div>

      {/* Partner info */}
      <div className="text-center text-xs">
        <span className="font-semibold text-yellow-600">Partner:</span>
        {partnerName ? (
          <span className="text-yellow-600 ml-1">
            <span className="text-lg">{SEAT_EMOJI[view.partnerSeatRevealed!]}</span> {partnerName} ({partnerCardDisplay})
          </span>
        ) : (
          <span className="text-yellow-600 ml-1 font-semibold">{partnerCardDisplay}</span>
        )}
      </div>
    </div>
  );
}
