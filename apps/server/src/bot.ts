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

// Standard bridge point count: A=4, K=3, Q=2, J=1
function countPoints(hand: Card[]): number {
  const pointMap: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };
  return hand.reduce((sum, card) => sum + (pointMap[card.rank] || 0), 0);
}

// Find best suit to bid (longest suit, or highest cards)
function bestSuit(hand: Card[]): Trump {
  const suitCounts = { S: 0, H: 0, D: 0, C: 0 };
  const suitPoints = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of hand) {
    suitCounts[card.suit as Exclude<Trump, 'NT'>]++;
    const pointMap: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };
    suitPoints[card.suit as Exclude<Trump, 'NT'>] += pointMap[card.rank] || 0;
  }
  // Prefer longest suit; if tied, prefer suit with most points
  const sorted = ['S', 'H', 'D', 'C'].sort(
    (a, b) => suitCounts[b as Exclude<Trump, 'NT'>] - suitCounts[a as Exclude<Trump, 'NT'>] || suitPoints[b as Exclude<Trump, 'NT'>] - suitPoints[a as Exclude<Trump, 'NT'>]
  );
  return sorted[0] as Trump;
}

export function botBid(view: PlayerView, difficulty: 'random' | 'smart' = 'smart'): Bid | 'pass' {
  const hand = view.myHand;
  const points = countPoints(hand);

  // If there's already a bid, decide whether to overcall
  if (view.highestBid) {
    const currentLevel = view.highestBid.bid.level;
    // Need significant points to overcall: roughly 15+ for level 1, more for higher levels
    const pointsNeeded = 15 + currentLevel * 3;
    if (points >= pointsNeeded && currentLevel < 3) {
      // Overcall at level + 1, but cap at level 3
      const newLevel = Math.min(currentLevel + 1, 3) as Bid['level'];
      return { level: newLevel, trump: bestSuit(hand) };
    }
    return 'pass';
  }

  // Opening bid: 13+ points required to open, start with level 1
  if (points < 13) {
    return 'pass';
  }

  // Calculate bid level based on points: roughly level = (points - 13) / 4 + 1, but cap at 3
  // 13-16 pts = level 1, 17-20 pts = level 2, 21+ pts = level 3
  let level: Bid['level'] = 1;
  if (points >= 21) level = 3;
  else if (points >= 17) level = 2;

  return { level, trump: bestSuit(hand) };
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
