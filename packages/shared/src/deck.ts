import type { Card, Rank, Suit } from './types.js';

const SUITS: Suit[] = ['C', 'D', 'H', 'S'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const RANK_ORDER: Record<Rank, number> = Object.fromEntries(
  RANKS.map((r, i) => [r, i])
) as Record<Rank, number>;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// Mulberry32 PRNG for deterministic seeds in tests.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck: Card[], seed?: number): Card[] {
  const out = deck.slice();
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function deal(seed?: number): Card[][] {
  const shuffled = shuffle(createDeck(), seed);
  const hands: Card[][] = [[], [], [], []];
  for (let i = 0; i < 52; i++) hands[i % 4].push(shuffled[i]);
  for (const h of hands) sortHand(h);
  return hands;
}

export function sortHand(hand: Card[]): void {
  const suitOrder: Record<Suit, number> = { S: 0, H: 1, D: 2, C: 3 };
  hand.sort((a, b) => {
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return RANK_ORDER[b.rank] - RANK_ORDER[a.rank];
  });
}

export function cardEquals(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function cardCode(c: Card): string {
  return `${c.rank}${c.suit}`;
}

export function parseCard(code: string): Card {
  return { rank: code.slice(0, -1) as Rank, suit: code.slice(-1) as Suit };
}
