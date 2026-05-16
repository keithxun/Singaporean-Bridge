import {
  canFollow,
  isLegalPlay,
  RANK_ORDER,
  type Bid,
  type Card,
  type GameState,
  type PlayerView,
  type SeatIndex,
  type Trump,
} from '@sgb/shared';

// Standard bridge point count: A=4, K=3, Q=2, J=1
// Plus distribution bonus: +1 point per long suit (5+ cards)
function countPoints(hand: Card[]): number {
  const pointMap: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };
  let points = hand.reduce((sum, card) => sum + (pointMap[card.rank] || 0), 0);

  // Add distribution bonus: +1 per long suit (5+ cards)
  const suitCounts = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of hand) {
    suitCounts[card.suit as Exclude<Trump, 'NT'>]++;
  }
  for (const count of Object.values(suitCounts)) {
    if (count >= 5) points += 1;
  }

  return points;
}

// Find best suit to bid: highest point value in any suit
function bestSuit(hand: Card[]): Trump {
  const suitPoints = { S: 0, H: 0, D: 0, C: 0 };
  const suitCounts = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of hand) {
    suitCounts[card.suit as Exclude<Trump, 'NT'>]++;
    const pointMap: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };
    suitPoints[card.suit as Exclude<Trump, 'NT'>] += pointMap[card.rank] || 0;
  }
  // Prefer suit with most points; if tied, prefer longest suit
  const sorted = ['S', 'H', 'D', 'C'].sort(
    (a, b) => suitPoints[b as Exclude<Trump, 'NT'>] - suitPoints[a as Exclude<Trump, 'NT'>] || suitCounts[b as Exclude<Trump, 'NT'>] - suitCounts[a as Exclude<Trump, 'NT'>]
  );
  return sorted[0] as Trump;
}

export function botBid(view: PlayerView, difficulty: 'random' | 'smart' = 'smart'): Bid | 'pass' {
  const hand = view.myHand;
  const points = countPoints(hand);

  // Calculate what bid level AI would make with its own points (opening bid thresholds)
  function calculateBidLevel(pts: number): Bid['level'] | null {
    if (pts >= 20) return 3;
    if (pts >= 17) return 2;
    if (pts >= 13) return 1;
    return null;
  }

  const myBidLevel = calculateBidLevel(points);

  // If there's already a bid, decide whether to overcall
  if (view.highestBid) {
    const currentLevel = view.highestBid.bid.level;
    // Only outbid if my calculated level is higher than current bid
    if (myBidLevel && myBidLevel > currentLevel) {
      return { level: myBidLevel, trump: bestSuit(hand) };
    }
    return 'pass';
  }

  // Opening bid: bid if we have enough points
  if (!myBidLevel) {
    return 'pass';
  }

  return { level: myBidLevel, trump: bestSuit(hand) };
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
  // Find legal plays using proper isLegalPlay rules
  const legal = hand.filter((c) => isLegalPlay(hand, c, view.currentTrick, view.contract?.trump, view.trumpBroken));

  if (difficulty === 'random' || legal.length === 1) {
    return legal[Math.floor(Math.random() * legal.length)];
  }

  // Smart: card counting, avoid wasting high cards if can't win trick
  const trick = view.currentTrick;
  const contract = view.contract;

  // Count cards played to detect suit exhaustion
  const playedCards = getPlayedCards(view);
  const exhaustedSuits = getExhaustedSuits(playedCards);

  if (!trick || trick.cards.length === 0) {
    // Opening lead: lead high card from legal plays (respects trump breaking rule)
    return leadCard(legal);
  }

  const ledSuit = trick.cards[0].card.suit;
  const suitCards = legal.filter((c) => c.suit === ledSuit);

  if (suitCards.length > 0) {
    // Follow suit: play highest of led suit
    suitCards.sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
    return suitCards[0];
  }

  // Cannot follow suit
  const trickWinner = winnerOfTrick(trick, contract?.trump || 'NT');
  const canBeatCurrentWinner = contract && legal.some((c) =>
    c.suit === contract.trump && (RANK_ORDER[c.rank] > RANK_ORDER[trick.cards.find(t => t.seat === trickWinner)?.card.rank || '2'])
  );

  // Must trump or play off-suit
  if (contract) {
    const trumpCards = legal.filter((c) => c.suit === contract.trump);
    if (trumpCards.length > 0) {
      // Only trump if we can beat the current winning card, or if partner is not winning
      if (canBeatCurrentWinner || trickWinner !== view.partnerSeatRevealed) {
        // Can beat or should trump: play lowest trump to minimize loss
        trumpCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
        return trumpCards[0];
      } else {
        // Partner is winning and we can't beat, play off-suit if possible
        const offSuit = legal.filter((c) => c.suit !== contract.trump);
        if (offSuit.length > 0) {
          // Play lowest card to minimize waste
          offSuit.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
          return offSuit[0];
        }
      }
    }
  }

  // Cannot follow suit and no trump available: play smallest card
  legal.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  return legal[0];
}

// Track all cards that have been played
function getPlayedCards(view: PlayerView): Card[] {
  const played: Card[] = [];
  // Add cards from completed tricks
  for (const trick of view.tricks) {
    for (const { card } of trick.cards) {
      played.push(card);
    }
  }
  // Add cards from current trick
  if (view.currentTrick) {
    for (const { card } of view.currentTrick.cards) {
      played.push(card);
    }
  }
  return played;
}

// Detect which suits have all 13 cards played (suit exhaustion)
function getExhaustedSuits(playedCards: Card[]): Set<string> {
  const suitCounts = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of playedCards) {
    suitCounts[card.suit as Exclude<Trump, 'NT'>]++;
  }
  const exhausted = new Set<string>();
  for (const [suit, count] of Object.entries(suitCounts)) {
    if (count === 13) {
      exhausted.add(suit);
    }
  }
  return exhausted;
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
