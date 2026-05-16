'use client';
import type { Card as TCard, Suit } from '@sgb/shared';

const SUIT_GLYPH: Record<Suit, string> = { C: '♣', D: '♦', H: '♥', S: '♠' };
const SUIT_COLOR: Record<Suit, string> = {
  C: 'text-slate-900',
  D: 'text-red-600',
  H: 'text-red-600',
  S: 'text-slate-900',
};

export function CardView({
  card,
  onClick,
  disabled,
  small,
  animate,
}: {
  card: TCard;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  animate?: boolean;
}) {
  const size = small ? 'w-10 h-14 text-sm' : 'w-14 h-20 text-lg';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${size} bg-white rounded shadow border ${SUIT_COLOR[card.suit]} flex flex-col items-center justify-center font-semibold transition-all ${
        animate ? 'animate-slide-in' : ''
      } ${disabled ? 'opacity-50' : 'hover:-translate-y-1 cursor-pointer'}`}
      style={
        animate
          ? {
              animation: 'slideIn 0.5s ease-out',
            }
          : undefined
      }
    >
      <span>{card.rank === 'T' ? '10' : card.rank}</span>
      <span className="text-2xl leading-none">{SUIT_GLYPH[card.suit]}</span>
    </button>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  const size = small ? 'w-10 h-14' : 'w-14 h-20';
  return <div className={`${size} bg-emerald-700 border border-emerald-500 rounded shadow`} />;
}
