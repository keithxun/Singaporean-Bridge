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

interface SuitAnalysis {
  suit: Trump;
  points: number;
  length: number;
  strength: 'weak' | 'medium' | 'strong';
}

// Enhanced point count with suit strength penalty
function countPoints(hand: Card[]): number {
  const pointMap: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };
  let points = hand.reduce((sum, card) => sum + (pointMap[card.rank] || 0), 0);

  const suitCounts = { S: 0, H: 0, D: 0, C: 0 };
  const suitPoints = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of hand) {
    const suit = card.suit as Exclude<Trump, 'NT'>;
    suitCounts[suit]++;
    suitPoints[suit] += pointMap[card.rank] || 0;
  }

  // Distribution bonus: +1 per long suit (5+ cards)
  for (const count of Object.values(suitCounts)) {
    if (count >= 5) points += 1;
  }

  // Penalty for weak suits: -1 if <3 cards and no honors
  for (const suit of ['S', 'H', 'D', 'C']) {
    const s = suit as Exclude<Trump, 'NT'>;
    if (suitCounts[s] < 3 && suitPoints[s] <= 1) {
      points -= 1; // Penalty for unprotected weak suit
    }
  }

  return Math.max(0, points);
}

// Analyze all suits for best bidding suit
function analyzeSuits(hand: Card[]): SuitAnalysis[] {
  const pointMap: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };
  const suitData: Record<string, { points: number; length: number }> = {};

  for (const suit of SUITS) {
    suitData[suit] = { points: 0, length: 0 };
  }

  for (const card of hand) {
    suitData[card.suit].points += pointMap[card.rank] || 0;
    suitData[card.suit].length++;
  }

  return Object.entries(suitData)
    .map(([suit, { points, length }]) => {
      const strength: 'weak' | 'medium' | 'strong' = points >= 3 && length >= 4 ? 'strong' : points >= 1 && length >= 3 ? 'medium' : 'weak';
      return {
        suit: suit as Trump,
        points,
        length,
        strength,
      };
    })
    .sort((a, b) => {
      // Prefer strong suits with 4+ cards and 3+ points
      if (a.strength !== b.strength) return (a.strength === 'strong' ? -1 : 1);
      return b.points - a.points || b.length - a.length;
    });
}

function bestSuit(hand: Card[]): Trump {
  const suits = analyzeSuits(hand);
  return suits[0].suit;
}

export function botBid(view: PlayerView, difficulty: 'random' | 'smart' = 'smart'): Bid | 'pass' {
  const hand = view.myHand;
  const points = countPoints(hand);

  // Sliding scale: smoother bidding thresholds
  function calculateBidLevel(pts: number): Bid['level'] | null {
    if (pts >= 20) return 3;
    if (pts >= 17) return 2;
    if (pts >= 13) return 1;
    return null;
  }

  const myBidLevel = calculateBidLevel(points);

  // If someone already bid: only bid if we have higher level
  if (view.highestBid) {
    const currentLevel = view.highestBid.bid.level;
    // Adjust threshold up based on opponent bid strength (don't over-bid)
    if (myBidLevel && myBidLevel > currentLevel) {
      return { level: myBidLevel, trump: bestSuit(hand) };
    }
    return 'pass';
  }

  // No one has bid: bid our level if we have one
  if (!myBidLevel) {
    return 'pass';
  }

  return { level: myBidLevel, trump: bestSuit(hand) };
}

export function botCallPartner(hand: Card[], trumpSuit?: string): Card {
  const pointMap: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };

  // Strategy: 70% call trump (strong partner setup), 30% call balanced card
  const usesTrump = Math.random() < 0.7;

  if (usesTrump && trumpSuit && trumpSuit !== 'NT' && SUITS.includes(trumpSuit as any)) {
    // Call highest trump not in hand
    const trumpRanks = [...RANKS].reverse();
    for (const rank of trumpRanks) {
      const card: Card = { suit: trumpSuit as Exclude<Trump, 'NT'>, rank };
      if (!hand.some((h) => h.suit === card.suit && h.rank === card.rank)) {
        return card;
      }
    }
  }

  // Fallback: call a card that helps distribute strength
  // Prefer mid-range cards (not A-K which might be critical)
  const allCards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      allCards.push({ suit, rank });
    }
  }
  const available = allCards.filter((c) => !hand.some((h) => h.suit === c.suit && h.rank === c.rank));

  // Prefer balanced cards (not all honors)
  const midCards = available.filter((c) => {
    const pts = pointMap[c.rank] || 0;
    return pts <= 2; // Jack and below, avoid A-K
  });

  if (midCards.length > 0) {
    return midCards[Math.floor(Math.random() * midCards.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

export function botPlay(
  view: PlayerView,
  hand: Card[],
  difficulty: 'random' | 'smart' = 'smart'
): Card {
  try {
    const legal = hand.filter((c) => isLegalPlay(hand, c, view.currentTrick, view.contract?.trump, view.trumpBroken));

    if (legal.length === 0) {
      throw new Error(`No legal plays found for seat ${view.seat}`);
    }

    if (difficulty === 'random' || legal.length === 1) {
      return legal[Math.floor(Math.random() * legal.length)];
    }

    // Smart play logic
    const trick = view.currentTrick;
    const contract = view.contract;
    const partnerConfirmed = view.partnerSeatRevealed !== undefined;
    const shownOuts = getShownOuts(view);
    const remainingTrumps = countRemainingTrumps(view, hand, contract?.trump);

    // Opening lead
    if (!trick || trick.cards.length === 0) {
      return selectOpeningLead(legal, view, hand, shownOuts);
    }

    // Follow suit if possible
    const ledSuit = trick.cards[0].card.suit;
    const suitCards = legal.filter((c) => c.suit === ledSuit);

    if (suitCards.length > 0) {
      return selectFollowCard(suitCards, trick, view, hand, contract?.trump);
    }

    // Cannot follow suit
    const trickWinner = winnerOfTrick(trick, contract?.trump || 'NT');
    const partnerIsWinning = partnerConfirmed && trickWinner === view.partnerSeatRevealed;
    const winningCard = trick.cards.find((t) => t.seat === trickWinner)?.card;

    // If partner is winning with high card: throw off-suit (signal)
    if (partnerIsWinning && winningCard && ['A', 'K', 'Q'].includes(winningCard.rank)) {
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
        // Analyze if we should trump
        if (shouldTrump(trick, winningCard, trumpCards, partnerIsWinning, remainingTrumps)) {
          return selectTrumpCard(trumpCards, winningCard, partnerIsWinning);
        } else {
          // Throw off-suit low card
          const offSuit = legal.filter((c) => c.suit !== contract.trump);
          if (offSuit.length > 0) {
            offSuit.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
            return offSuit[0];
          }
        }
      }
    }

    // Fallback: play smallest card
    legal.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    return legal[0];
  } catch (error) {
    const legal = hand.filter((c) => isLegalPlay(hand, c, view.currentTrick, view.contract?.trump, view.trumpBroken));
    if (legal.length > 0) {
      return legal[0];
    }
    throw new Error(`Bot move failed: unable to find legal play for seat ${view.seat}`);
  }
}

// Track which suits each opponent has shown out of (void)
function getShownOuts(view: PlayerView): Map<SeatIndex, Set<string>> {
  const outs = new Map<SeatIndex, Set<string>>();
  for (let i = 0; i < 4; i++) outs.set(i as SeatIndex, new Set());

  if (!Array.isArray(view.tricks)) return outs;

  for (const trick of view.tricks) {
    if (trick.cards.length <= 1) continue;
    const ledSuit = trick.cards[0].card.suit;

    for (let i = 1; i < trick.cards.length; i++) {
      const { seat, card } = trick.cards[i];
      // If didn't follow the led suit, they're void
      if (card.suit !== ledSuit) {
        outs.get(seat)?.add(ledSuit);
      }
    }
  }

  // Check current trick
  if (view.currentTrick && view.currentTrick.cards.length > 1) {
    const ledSuit = view.currentTrick.cards[0].card.suit;
    for (let i = 1; i < view.currentTrick.cards.length; i++) {
      const { seat, card } = view.currentTrick.cards[i];
      if (card.suit !== ledSuit) {
        outs.get(seat)?.add(ledSuit);
      }
    }
  }

  return outs;
}

// Count remaining trump cards
function countRemainingTrumps(view: PlayerView, hand: Card[], trump?: Trump): number {
  if (!trump || trump === 'NT') return 0;

  // Count trumps in hand
  const inHand = hand.filter((c) => c.suit === trump).length;

  // Estimate trumps played
  let played = 0;
  if (Array.isArray(view.tricks)) {
    for (const trick of view.tricks) {
      for (const { card } of trick.cards) {
        if (card.suit === trump) played++;
      }
    }
  }
  if (view.currentTrick) {
    for (const { card } of view.currentTrick.cards) {
      if (card.suit === trump) played++;
    }
  }

  // 13 total per suit, minus what we see
  return 13 - inHand - played;
}

// Decide if we should trump this trick
function shouldTrump(
  trick: Trick,
  winningCard: Card | undefined,
  trumpCards: Card[],
  partnerIsWinning: boolean,
  remainingTrumps: number
): boolean {
  // Always trump if we can beat winner and partner isn't winning
  if (winningCard && !partnerIsWinning) {
    const lowestTrump = trumpCards.reduce((min, c) => RANK_ORDER[c.rank] < RANK_ORDER[min.rank] ? c : min);
    if (RANK_ORDER[lowestTrump.rank] > RANK_ORDER[winningCard.rank]) {
      return true; // We can beat them
    }
  }

  // Don't waste trump if partner is already winning
  if (partnerIsWinning) return false;

  // Don't waste high trump if many remain
  if (remainingTrumps > 5 && trumpCards[0].rank === 'A') return false;

  return false;
}

// Select which trump to play
function selectTrumpCard(trumpCards: Card[], winningCard: Card | undefined, partnerIsWinning: boolean): Card {
  if (partnerIsWinning) {
    // Throw smallest trump
    trumpCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    return trumpCards[0];
  }

  // Try to win with smallest possible trump
  trumpCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  if (winningCard) {
    for (const trump of trumpCards) {
      if (RANK_ORDER[trump.rank] > RANK_ORDER[winningCard.rank]) {
        return trump; // Return smallest trump that beats winner
      }
    }
  }

  return trumpCards[0]; // Fallback: play smallest
}

// Select opening lead card
function selectOpeningLead(legal: Card[], view: PlayerView, hand: Card[], shownOuts: Map<SeatIndex, Set<string>>): Card {
  const partnerConfirmed = view.partnerSeatRevealed !== undefined;

  // Lead from suit partner is void in (help partner ruff)
  if (partnerConfirmed && view.partnerSeatRevealed) {
    const partnerVoids = shownOuts.get(view.partnerSeatRevealed) || new Set();
    for (const voidSuit of partnerVoids) {
      const voidCards = legal.filter((c) => c.suit === voidSuit);
      if (voidCards.length > 0) {
        // Lead high from void suit to encourage partner
        voidCards.sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
        return voidCards[0];
      }
    }
  }

  // Lead weak suit (force opponent setup)
  const suits = analyzeSuits(hand);
  for (const suit of suits) {
    if (suit.strength === 'weak') {
      const suitCards = legal.filter((c) => c.suit === suit.suit);
      if (suitCards.length > 0) {
        suitCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
        return suitCards[0]; // Lead low from weak suit
      }
    }
  }

  // Fallback: lead from longest suit
  const longest = suits[0];
  const suitCards = legal.filter((c) => c.suit === longest.suit);
  if (suitCards.length > 0) {
    suitCards.sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
    return suitCards[0];
  }

  return legal[0];
}

// Select which card to play when following suit
function selectFollowCard(suitCards: Card[], trick: Trick, view: PlayerView, hand: Card[], trump?: Trump): Card {
  const trickWinner = winnerOfTrick(trick, trump || 'NT');
  const partnerConfirmed = view.partnerSeatRevealed !== undefined;
  const partnerIsWinning = partnerConfirmed && trickWinner === view.partnerSeatRevealed;

  // If partner is winning: play low (keep honors)
  if (partnerIsWinning) {
    suitCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    return suitCards[0];
  }

  // Can we beat the current winner?
  const winningCard = trick.cards.find((t) => t.seat === trickWinner)?.card;
  const canBeat = suitCards.some((c) => RANK_ORDER[c.rank] > RANK_ORDER[winningCard?.rank || '2']);

  if (canBeat) {
    // Play smallest card that beats winner (honor retention)
    suitCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    for (const card of suitCards) {
      if (RANK_ORDER[card.rank] > RANK_ORDER[winningCard?.rank || '2']) {
        return card;
      }
    }
  }

  // Cannot beat: play smallest card
  suitCards.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  return suitCards[0];
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
