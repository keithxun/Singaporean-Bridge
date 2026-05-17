'use client';
import { useState } from 'react';
import type { Bid, Card, PlayerView, Trump } from '@sgb/shared';

const TRUMPS: Trump[] = ['C', 'D', 'H', 'S', 'NT'];
const TRUMP_LABEL: Record<Trump, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

function countPoints(hand: Card[]): number {
  const pointMap: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };
  return hand.reduce((sum, card) => sum + (pointMap[card.rank] || 0), 0);
}

export function BiddingPanel({
  view,
  onBid,
}: {
  view: PlayerView;
  onBid: (bid: Bid | 'pass') => void;
}) {
  const [level, setLevel] = useState<Bid['level']>(1);
  const [trump, setTrump] = useState<Trump>('C');
  const myTurn = view.turn === view.seat;
  const points = countPoints(view.myHand);
  const isWash = points < 4;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="text-xs md:text-sm text-ink">
          Highest bid:{' '}
          {view.highestBid
            ? `${view.highestBid.bid.level}${TRUMP_LABEL[view.highestBid.bid.trump]} by seat ${view.highestBid.seat}`
            : '—'}
        </div>
        {myTurn && <div className="text-xs font-semibold text-wood">Points: {points}</div>}
      </div>
      {myTurn ? (
        <div className="space-y-2">
          {isWash && (
            <div className="bg-red-100 border-2 border-red-500 rounded p-2 text-xs text-red-700 font-semibold">
              ⚠️ Less than 4 points - must wash
            </div>
          )}
          <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-3 items-stretch md:items-center">
            {!isWash && (
              <>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value) as Bid['level'])}
                  className="bg-white border-2 border-wood-dark rounded px-3 py-2 text-sm text-ink font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1 flex-wrap">
                  {TRUMPS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTrump(t)}
                      className={`px-3 py-2 md:px-2 md:py-1 rounded text-sm font-semibold transition ${trump === t ? 'bg-gold text-white' : 'bg-white text-ink border-2 border-wood-dark'}`}
                    >
                      {TRUMP_LABEL[t]}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-2 md:flex-row flex-col">
              {!isWash && (
                <button
                  onClick={() => onBid({ level, trump })}
                  className="bg-felt hover:bg-felt-dark text-white font-semibold px-4 py-2 rounded text-sm transition"
                >
                  Bid
                </button>
              )}
              {isWash ? (
                <button
                  onClick={() => onBid('pass')}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded text-sm flex-1 transition"
                >
                  Wash
                </button>
              ) : (
                <button
                  onClick={() => onBid('pass')}
                  className="bg-wood-dark hover:bg-wood text-white px-4 py-2 rounded text-sm font-semibold transition"
                >
                  Pass
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-wood text-sm">Waiting for seat {view.turn}…</div>
      )}
      <div className="text-xs text-ink/60">
        History:{' '}
        {view.bidHistory
          .map((b) =>
            b.bid === 'pass'
              ? `s${b.seat}:pass`
              : `s${b.seat}:${b.bid.level}${TRUMP_LABEL[b.bid.trump]}`
          )
          .join(' · ') || '—'}
      </div>
    </div>
  );
}
