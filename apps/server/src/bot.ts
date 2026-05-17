import {
  canFollow,
  isLegalPlay,
  RANK_ORDER,
  RANKS,
  SUITS,
  type Bid,
  type Card,
  type GameState,
  type PlayerView,
  type SeatIndex,
  type Trick,
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

  function calculateBidLevel(pts: number): Bid['level'] | null {
    if (pts >= 20) return 3;
    if (pts >= 17) return 2;
    if (pts >= 13) return 1;
    return null;
  }

  const myBidLevel = calculateBidLevel(points);

  if (view.highestBid) {
    const currentLevel = view.highestBid.bid.level;
    if (myBidLevel && myBidLevel > currentLevel) {
      return { level: myBidLevel, trump: bestSuit(hand) };
    }
    return 'pass';
  }

  if (!myBidLevel) {
    return 'pass';
  }

  return { level: myBidLevel, trump: bestSuit(hand) };
}

export function botCallPartner(hand: Card[], trumpSuit?: string): Card {
  // Try to call highest trump card not in hand (A-K-Q-J-T-9-8-7-6-5-4-3-2 order)
  const trumpRanks = [...RANKS].reverse();
  if (trumpSuit && trumpSuit !== 'NT' && SUITS.includes(trumpSuit as any)) {
    for (const rank of trumpRanks) {
      const card: Card = { suit: trumpSuit as Exclude<typeof Card.suit, undefined>, rank };
      if (!hand.some((h) => h.suit === card.suit && h.rank === card.rank)) {
        return card;
      }
    }
  }

  // Fallback: pick a random card not in hand
  const allCards: Card[] = [];
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
  try {
    // Find legal plays using proper isLegalPlay rules
    const legal = hand.filter((c) => isLegalPlay(hand, c, view.currentTrick, view.contract?.trump, view.trumpBroken));

    // Ensure we always have at least one legal card
    if (legal.length === 0) {
      throw new Error(`No legal plays found for seat ${view.seat}`);
    }

    // Random or forced move
    if (difficulty === 'random' || legal.length === 1) {
      return legal[Math.floor(Math.random() * legal.length)];
    }

    // Smart play logic
    const trick = view.currentTrick;
    const contract = view.contract;
    const partnerConfirmed = view.partnerSeatRevealed !== undefined;

    // Opening lead
    if (!trick || trick.cards.length === 0) {
      if (partnerConfirmed) {
        const partnerMissingSuits = getPartnerMissingSuits(view);
        const feedSuits = legal.filter((c) => partnerMissingSuits.has(c.suit));
        if (feedSuits.length > 0) {
          feedSuits.sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
          return feedSuits[0];
        }
      }
      return leadCard(legal);
    }

    // In progress trick: follow suit if possible
    const ledSuit = trick.cards[0].card.suit;
    const suitCards = legal.filter((c) => c.suit === ledSuit);

    if (suitCards.length > 0) {
      suitCards.sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
      return suitCards[0];
    }

    // Cannot follow suit: apply trump strategy
    const trickWinner = winnerOfTrick(trick, contract?.trump || 'NT');
    const partnerIsWinning = partnerConfirmed && trickWinner === view.partnerSeatRevealed;
    const winningCard = trick.cards.find((t) => t.seat === trickWinner)?.card;

    if (partnerIsWinning && winningCard?.rank === 'A') {
      // Partner winning with ace: play off-suit
      const offSuit = legal.filter((c) => !contract || c.suit !== contract.trump);
      if (offSuit.length > 0) {
        offSuit.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
        return offSuit[0];
      }
    }

    // Trump logic
    if (contract) {
      const trumpCards = legal.filter((c) => c.suit === contract.trump);
      if (trumpCards.length > 0) {
        const canBeatWinner = winningCard && RANK_ORDER[trumpCards[0].rank] > RANK_ORDER[winningCard.rank];

        if (canBeatWinner || !partnerIsWinning) {
          trumpCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
          return trumpCards[0];
        } else if (partnerIsWinning) {
          const offSuit = legal.filter((c) => c.suit !== contract.trump);
          if (offSuit.length > 0) {
            offSuit.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
            return offSuit[0];
          }
          // No off-suit option, must play low trump
          trumpCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
          return trumpCards[0];
        }
      }
    }

    // Fallback: play smallest card
    legal.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    return legal[0];
  } catch (error) {
    // Emergency fallback: ensure we return a legal card
    const legal = hand.filter((c) => isLegalPlay(hand, c, view.currentTrick, view.contract?.trump, view.trumpBroken));
    if (legal.length > 0) {
      return legal[0];
    }
    throw new Error(`Bot move failed: unable to find legal play for seat ${view.seat}`);
  }
}

// Detect which suits the partner is out of (missing) by analyzing tricks
function getPartnerMissingSuits(view: PlayerView): Set<string> {
  const partnerSeat = view.partnerSeatRevealed;
  if (partnerSeat === undefined) return new Set();
  if (!Array.isArray(view.tricks)) return new Set();

  // Look through all tricks to find a suit partner couldn't follow
  for (const trick of view.tricks) {
    if (trick.cards.length === 0) continue;
    const ledSuit = trick.cards[0].card.suit;

    // Find what partner played in this trick
    const partnerCard = trick.cards.find((t) => t.seat === partnerSeat);
    if (partnerCard && partnerCard.card.suit !== ledSuit) {
      // Partner didn't follow the led suit: they're out of it
      return new Set([ledSuit]);
    }
  }

  // Check current trick
  if (view.currentTrick && view.currentTrick.cards.length > 0) {
    const ledSuit = view.currentTrick.cards[0].card.suit;
    const partnerCard = view.currentTrick.cards.find((t) => t.seat === partnerSeat);
    if (partnerCard && partnerCard.card.suit !== ledSuit) {
      return new Set([ledSuit]);
    }
  }

  return new Set();
}

function leadCard(hand: Card[]): Card {
  // Lead highest card
  const sorted = [...hand].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
  return sorted[0];
}

function winnerOfTrick(trick: Trick, trump: Trump): SeatIndex {
  if (trick.cards.length === 0) throw new Error('Cannot determine winner of empty trick');
  const led = trick.cards[0].card.suit;
  let winner: SeatIndex = trick.cards[0].seat;
  let winningCard: Card = trick.cards[0].card;

  for (let i = 1; i < trick.cards.length; i++) {
    const { seat, card } = trick.cards[i];
    if (
      (trump !== 'NT' && card.suit === trump && winningCard.suit !== trump) ||
      (card.suit === winningCard.suit && RANK_ORDER[card.rank] > RANK_ORDER[winningCard.rank])
    ) {
      winner = seat;
      winningCard = card;
    }
  }
  return winner;
}
