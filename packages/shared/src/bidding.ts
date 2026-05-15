import type { Bid, Trump } from './types.js';

const TRUMP_RANK: Record<Trump, number> = { C: 0, D: 1, H: 2, S: 3, NT: 4 };

export function bidValue(b: Bid): number {
  return b.level * 5 + TRUMP_RANK[b.trump];
}

export function isHigherBid(candidate: Bid, current?: Bid): boolean {
  if (!current) return true;
  return bidValue(candidate) > bidValue(current);
}
