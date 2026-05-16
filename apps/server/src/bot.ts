import {
  canFollow,
  RANK_ORDER,
  type Bid,
  type Card,
  type GameState,
  type PlayerView,
  type SeatIndex,
  type Trump,
} from '@sgb/shared';

export function botBid(view: PlayerView, difficulty: 'random' | 'smart' = 'smart'): Bid | 'pass' {
  const hand = view.myHand;
  const jRank = 'J' as any as keyof typeof RANK_ORDER;
  const highCards = hand.filter((c) => RANK_ORDER[c.rank as any as keyof typeof RANK_ORDER] >= RANK_ORDER[jRank]).length;

  // If there's already a bid, must exceed it or pass
  if (view.highestBid) {
    // Try to bid only if we have decent strength
    if (highCards >= 3) {
      const level = Math.min(view.highestBid.bid.level + 1, 7) as Bid['level'];
      const trump: Trump[] = ['S', 'H', 'D', 'C', 'NT'];
      return { level, trump: trump[Math.floor(Math.random() * trump.length)] };
    }
    return 'pass';
  }

  // Opening bid: be conservative
  if (highCards >= 2) {
    const level = Math.max(1, Math.min(highCards - 1, 7)) as Bid['level'];
    const trump: Trump[] = ['S', 'H', 'D', 'C', 'NT'];
    return { level, trump: trump[Math.floor(Math.random() * trump.length)] };
  }

  return 'pass';
}

export function botCallPartner(hand: Card[]): Card {
  // Pick a random card not in hand
  const allCards: Card[] = [];
  const SUITS = ['C', 'D', 'H', 'S'] as const;
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      allCards.push({ suit, rank });
    }
  }
  const available = allCards.filter((c) => !hand.some((h) => h.suit === c.suit && h.rank === c.rank));
  return available[Math.floor(Math.random() * available.length)];
}

export function botPlay(
  view: PlayerView,
  hand: Card[],
  difficulty: 'random' | 'smart' = 'smart'
): Card {
  // Find legal plays
  const legal = legalPlays(hand, view.currentTrick);

  if (difficulty === 'random' || legal.length === 1) {
    return legal[Math.floor(Math.random() * legal.length)];
  }

  // Smart: prefer high cards of led suit, avoid trumping partner if possible
  const trick = view.currentTrick;
  const contract = view.contract;
  if (!trick || trick.cards.length === 0) {
    // Opening lead: lead high card of longest suit
    return leadCard(hand);
  }

  const ledSuit = trick.cards[0].card.suit;
  const suitCards = legal.filter((c) => c.suit === ledSuit);

  if (suitCards.length > 0) {
    // Follow suit: play highest of led suit
    suitCards.sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
    return suitCards[0];
  }

  // Must trump or play off-suit. If trumping, play low (save high trumps)
  if (contract) {
    const trumpCards = legal.filter((c) => c.suit === contract.trump);
    if (trumpCards.length > 0) {
      // Avoid trumping partner's winning card
      const trickWinner = winnerOfTrick(trick, contract.trump);
      if (trickWinner === view.partnerSeatRevealed) {
        // Partner is winning, don't trump
        const offSuit = legal.filter((c) => c.suit !== contract.trump);
        if (offSuit.length > 0) return offSuit[0];
      }
      // Play lowest trump
      trumpCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
      return trumpCards[0];
    }
  }

  return legal[0]; // fallback
}

function legalPlays(hand: Card[], currentTrick: any): Card[] {
  if (!currentTrick || currentTrick.cards.length === 0) {
    return hand;
  }
  const led = currentTrick.cards[0].card.suit;
  const canFollowLed = hand.filter((c) => c.suit === led);
  if (canFollowLed.length > 0) return canFollowLed;
  return hand;
}

function leadCard(hand: Card[]): Card {
  // Lead highest card
  const sorted = [...hand].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
  return sorted[0];
}

function winnerOfTrick(trick: any, trump: Trump): SeatIndex | null {
  if (trick.cards.length === 0) return null;
  const led = trick.cards[0].card.suit;
  let winner: SeatIndex = trick.cards[0].seat;
  let winningCard: Card = trick.cards[0].card;
  for (let i = 1; i < trick.cards.length; i++) {
    const { seat, card } = trick.cards[i];
    const cardRank = card.rank as any as keyof typeof RANK_ORDER;
    const winRank = winningCard.rank as any as keyof typeof RANK_ORDER;
    if (
      (trump !== 'NT' && card.suit === trump && winningCard.suit !== trump) ||
      (card.suit === winningCard.suit && RANK_ORDER[cardRank] > RANK_ORDER[winRank])
    ) {
      winner = seat;
      winningCard = card;
    }
  }
  return winner;
}
