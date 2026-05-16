import { RANK_ORDER } from './deck.js';
import type { Card, SeatIndex, Trick, Trump } from './types.js';

export function trickWinner(trick: Trick, trump: Trump): SeatIndex {
  if (trick.cards.length === 0) throw new Error('empty trick');
  const ledSuit = trick.cards[0].card.suit;
  let bestSeat = trick.cards[0].seat;
  let bestCard = trick.cards[0].card;
  for (let i = 1; i < trick.cards.length; i++) {
    const { seat, card } = trick.cards[i];
    if (beats(card, bestCard, ledSuit, trump)) {
      bestCard = card;
      bestSeat = seat;
    }
  }
  return bestSeat;
}

function beats(c: Card, best: Card, ledSuit: string, trump: Trump): boolean {
  const cIsTrump = trump !== 'NT' && c.suit === trump;
  const bIsTrump = trump !== 'NT' && best.suit === trump;
  if (cIsTrump && !bIsTrump) return true;
  if (!cIsTrump && bIsTrump) return false;
  if (cIsTrump && bIsTrump) return RANK_ORDER[c.rank] > RANK_ORDER[best.rank];
  // neither trump
  if (c.suit !== ledSuit) return false;
  if (best.suit !== ledSuit) return true;
  return RANK_ORDER[c.rank] > RANK_ORDER[best.rank];
}

export function canFollow(hand: Card[], ledSuit: string): boolean {
  return hand.some((c) => c.suit === ledSuit);
}

export function isLegalPlay(
  hand: Card[],
  card: Card,
  currentTrick: Trick | undefined,
  trump?: Trump,
  trumpBroken?: boolean
): boolean {
  if (!hand.some((c) => c.suit === card.suit && c.rank === card.rank)) return false;
  if (!currentTrick || currentTrick.cards.length === 0) {
    // Opening lead: cannot lead trump unless broken or only have trump
    if (trump && trump !== 'NT' && card.suit === trump && !trumpBroken) {
      const hasNonTrump = hand.some((c) => c.suit !== trump);
      if (hasNonTrump) return false;
    }
    return true;
  }
  const ledSuit = currentTrick.cards[0].card.suit;
  if (card.suit === ledSuit) return true;
  return !canFollow(hand, ledSuit);
}
