'use client';
import { useState } from 'react';
import type { Bid, PlayerView, Trump } from '@sgb/shared';

const TRUMPS: Trump[] = ['C', 'D', 'H', 'S', 'NT'];
const TRUMP_LABEL: Record<Trump, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

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

  return (
    <div className="bg-emerald-950/70 rounded p-3 space-y-2">
      <div className="text-xs md:text-sm">
        Highest bid:{' '}
        {view.highestBid
          ? `${view.highestBid.bid.level}${TRUMP_LABEL[view.highestBid.bid.trump]} by seat ${view.highestBid.seat}`
          : '—'}
      </div>
      {myTurn ? (
        <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-3 items-stretch md:items-center">
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
          <div className="flex gap-2 md:flex-row flex-col">
            <button
              onClick={() => onBid({ level, trump })}
              className="bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded text-sm"
            >
              Bid
            </button>
            <button onClick={() => onBid('pass')} className="bg-emerald-700 px-4 py-2 rounded text-sm font-semibold">
              Pass
            </button>
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
