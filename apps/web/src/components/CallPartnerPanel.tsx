'use client';
import { useState } from 'react';
import { RANKS, SUITS, type Card, type PlayerView, type Rank, type Suit } from '@sgb/shared';

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
    return <div className="text-sm text-wood">Seat {view.highestBid?.seat} is calling a partner…</div>;
  }
  return (
    <div className="bg-panel border-2 border-wood-dark rounded p-3 space-y-2">
      <div className="text-xs md:text-sm text-ink">Call your partner by naming a card you don't hold:</div>
      <div className="flex flex-col md:flex-row gap-2 md:gap-3 items-stretch md:items-center">
        <select value={rank} onChange={(e) => setRank(e.target.value as Rank)} className="bg-white border-2 border-wood-dark rounded px-3 py-2 text-sm text-ink font-semibold">
          {RANKS.map((r) => (
            <option key={r} value={r}>
              {r === 'T' ? '10' : r}
            </option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          {SUITS.map((s) => (
            <button
              key={s}
              onClick={() => setSuit(s)}
              className={`px-3 py-2 md:px-2 md:py-1 rounded text-sm font-semibold transition ${suit === s ? 'bg-gold text-white' : 'bg-white text-ink border-2 border-wood-dark'}`}
            >
              {SUIT_GLYPH[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => onCall({ rank, suit })}
          className="bg-felt text-white font-semibold px-4 py-2 rounded text-sm hover:bg-felt-dark transition"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
