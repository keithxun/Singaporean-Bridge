'use client';
import type { PlayerView, SeatIndex } from '@sgb/shared';
import { CardView } from './Card';

const SEAT_POS = ['bottom', 'left', 'top', 'right'] as const;
const SEAT_EMOJI = ['🧑', '👩', '🧔', '👱'] as const;
const TRUMP_LABEL: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

function relativePos(mySeat: SeatIndex, seat: SeatIndex) {
  const offset = ((seat - mySeat + 4) % 4) as 0 | 1 | 2 | 3;
  return SEAT_POS[offset];
}

export function Opponents({ view, names }: { view: PlayerView; names: Record<number, string> }) {
  const trick = view.currentTrick;
  const lastTrick = view.lastCompletedTrick;
  const displayTrick = trick && trick.cards.length > 0 ? trick : lastTrick;

  // Get current bid for each opponent (last bid in history)
  const getCurrentBid = (seat: SeatIndex) => {
    if (view.phase !== 'bidding') return null;
    const latestBid = [...view.bidHistory].reverse().find((b) => b.seat === seat);
    return latestBid ? latestBid.bid : null;
  };

  const opponents = [0, 1, 2, 3]
    .filter((s) => s !== view.seat)
    .map((s) => ({
      seat: s as SeatIndex,
      pos: relativePos(view.seat, s as SeatIndex),
    }))
    .sort((a, b) => ['left', 'top', 'right'].indexOf(a.pos) - ['left', 'top', 'right'].indexOf(b.pos));

  return (
    <div className="bg-felt px-1 py-1 flex-shrink-0">
      {/* Opponent badges row - each 1/3 width */}
      <div className="flex gap-1">
        {opponents.map(({ seat: s }) => {
          const isTurn = view.turn === s;
          const isDeclarer = view.contract?.declarer === s;
          const isPartner = view.contract && view.partnerSeatRevealed === s;
          const isWinner = displayTrick?.winner === s;
          const label = `${names[s] || `Seat ${s}`}${view.dealer === s ? '(D)' : ''}`;

          let bgColor = 'bg-wood-light text-ink';
          if (isWinner) {
            bgColor = 'bg-gold text-ink';
          } else if (isDeclarer) {
            bgColor = 'bg-gold text-ink';
          } else if (isPartner) {
            bgColor = 'bg-yellow-500 text-ink';
          } else if (isTurn) {
            bgColor = 'bg-gold text-ink';
          }

          const currentBid = getCurrentBid(s as SeatIndex);

          return (
            <div key={s} className="w-1/3 flex flex-col gap-1 min-w-0">
              <div className={`${bgColor} rounded px-2 py-1 text-center font-semibold shadow-sm flex-1 flex flex-col justify-center`}>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg">{SEAT_EMOJI[s]}</span>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-xs truncate font-bold">{label}</div>
                    <div className="text-xs opacity-90 flex gap-1">
                      <span>Score: {view.scores[s]}</span>
                      {view.tricksWonBy[s] > 0 && <span>♦{view.tricksWonBy[s]}</span>}
                    </div>
                  </div>
                </div>
              </div>
              {/* Show current bid or played card */}
              <div className="flex justify-center h-8">
                {currentBid ? (
                  <div className="text-xs font-bold text-gold bg-wood-dark rounded px-2 py-1">
                    {currentBid === 'pass' ? 'Pass' : `${currentBid.level}${TRUMP_LABEL[currentBid.trump]}`}
                  </div>
                ) : displayTrick ? (
                  displayTrick.cards.find((c) => c.seat === s) ? (
                    <CardView card={displayTrick.cards.find((c) => c.seat === s)!.card} disabled small />
                  ) : (
                    <div className="w-8 h-12 opacity-20" />
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
