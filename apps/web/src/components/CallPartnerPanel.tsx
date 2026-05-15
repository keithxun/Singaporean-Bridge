'use client';
import { useState } from 'react';
import type { Card, PlayerView, Rank, Suit } from '@sgb/shared';

const SUITS: Suit[] = ['C', 'D', 'H', 'S'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUIT_GLYPH: Record<Suit, string> = { C: '♣', D: '♦', H: '♥', S: '♠' };

export function CallPartnerPanel({
  view,
  onCall,
}: {
  view: PlayerView;
  onCall: (card: Card) => void;
}) {
  const [rank, setRank] = useState<Rank>('A');
  const [suit, setSuit] = useState<Suit>('S');
  const isDeclarer = view.highestBid?.seat === view.seat;
  if (!isDeclarer) {
    return <div className="text-sm text-emerald-300">Seat {view.highestBid?.seat} is calling a partner…</div>;
  }
  return (
    <div className="bg-emerald-950/70 rounded p-3 space-y-2">
      <div className="text-sm">Call your partner by naming a card you don't hold:</div>
      <div className="flex gap-2 items-center">
        <select value={rank} onChange={(e) => setRank(e.target.value as Rank)} className="bg-emerald-900 rounded px-2 py-1">
          {RANKS.map((r) => (
            <option key={r} value={r}>
              {r === 'T' ? '10' : r}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {SUITS.map((s) => (
            <button
              key={s}
              onClick={() => setSuit(s)}
              className={`px-2 py-1 rounded ${suit === s ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-800'}`}
            >
              {SUIT_GLYPH[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => onCall({ rank, suit })}
          className="bg-emerald-500 text-emerald-950 font-semibold px-3 py-1 rounded"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
