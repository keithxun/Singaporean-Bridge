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
      <div className="text-sm">
        Highest bid:{' '}
        {view.highestBid
          ? `${view.highestBid.bid.level}${TRUMP_LABEL[view.highestBid.bid.trump]} by seat ${view.highestBid.seat}`
          : '—'}
      </div>
      {myTurn ? (
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as Bid['level'])}
            className="bg-emerald-900 rounded px-2 py-1"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            {TRUMPS.map((t) => (
              <button
                key={t}
                onClick={() => setTrump(t)}
                className={`px-2 py-1 rounded ${trump === t ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-800'}`}
              >
                {TRUMP_LABEL[t]}
              </button>
            ))}
          </div>
          <button
            onClick={() => onBid({ level, trump })}
            className="bg-emerald-500 text-emerald-950 font-semibold px-3 py-1 rounded"
          >
            Bid
          </button>
          <button onClick={() => onBid('pass')} className="bg-emerald-700 px-3 py-1 rounded">
            Pass
          </button>
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
