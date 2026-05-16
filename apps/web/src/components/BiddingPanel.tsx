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
  const canBid = points >= 13;
  const isWash = points < 4;

  return (
    <div className="bg-emerald-950/70 rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-xs md:text-sm">
          Highest bid:{' '}
          {view.highestBid
            ? `${view.highestBid.bid.level}${TRUMP_LABEL[view.highestBid.bid.trump]} by seat ${view.highestBid.seat}`
            : '—'}
        </div>
        {myTurn && <div className="text-xs font-semibold text-emerald-300">Points: {points}</div>}
      </div>
      {myTurn ? (
        <div className="space-y-2">
          {isWash && (
            <div className="bg-red-900/50 border border-red-700 rounded p-2 text-xs text-red-300 font-semibold">
              ⚠️ Less than 4 points - must wash
            </div>
          )}
          <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-3 items-stretch md:items-center">
            {!isWash && (
              <>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value) as Bid['level'])}
                  className="bg-emerald-900 rounded px-3 py-2 text-sm"
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
                      className={`px-3 py-2 md:px-2 md:py-1 rounded text-sm ${trump === t ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-800'}`}
                    >
                      {TRUMP_LABEL[t]}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-2 md:flex-row flex-col">
              {!isWash && canBid && (
                <button
                  onClick={() => onBid({ level, trump })}
                  className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold px-4 py-2 rounded text-sm"
                >
                  Bid
                </button>
              )}
              {isWash ? (
                <button
                  onClick={() => onBid('pass')}
                  className="bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded text-sm flex-1"
                >
                  Wash
                </button>
              ) : (
                <button
                  onClick={() => onBid('pass')}
                  className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded text-sm font-semibold"
                >
                  Pass
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-emerald-300 text-sm">Waiting for seat {view.turn}…</div>
      )}
      <div className="text-xs text-emerald-300">
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
