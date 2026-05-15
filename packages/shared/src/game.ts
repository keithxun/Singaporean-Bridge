import { isHigherBid } from './bidding.js';
import { cardEquals, deal } from './deck.js';
import { isLegalPlay, trickWinner } from './trick.js';
import type {
  Bid,
  BidAction,
  Card,
  Contract,
  GameState,
  SeatIndex,
  Trick,
} from './types.js';

const nextSeat = (s: SeatIndex): SeatIndex => ((s + 1) % 4) as SeatIndex;

export function startGame(dealer: SeatIndex = 0, seed?: number): GameState {
  const hands = deal(seed);
  return {
    phase: 'bidding',
    dealer,
    turn: nextSeat(dealer),
    hands,
    bidHistory: [],
    consecutivePasses: 0,
    tricks: [],
    tricksWonBy: [0, 0, 0, 0],
    scores: [0, 0, 0, 0],
  };
}

export function applyBid(state: GameState, action: BidAction): GameState {
  if (state.phase !== 'bidding') throw new Error('not in bidding phase');
  if (action.seat !== state.turn) throw new Error('not your turn');
  const next: GameState = {
    ...state,
    bidHistory: [...state.bidHistory, action],
  };
  if (action.bid === 'pass') {
    next.consecutivePasses = state.consecutivePasses + 1;
  } else {
    if (!isHigherBid(action.bid, state.highestBid?.bid)) {
      throw new Error('bid must exceed current highest');
    }
    next.highestBid = { seat: action.seat, bid: action.bid };
    next.consecutivePasses = 0;
  }
  // End condition: if there's a highest bid and 3 passes, OR 4 passes with no bid (redeal scenario; we end with no contract)
  if (next.highestBid && next.consecutivePasses >= 3) {
    next.phase = 'callPartner';
    next.turn = next.highestBid.seat;
    return next;
  }
  if (!next.highestBid && next.bidHistory.length >= 4) {
    // all passed — caller can restart
    next.phase = 'scored';
    return next;
  }
  next.turn = nextSeat(state.turn);
  return next;
}

export function callPartner(state: GameState, seat: SeatIndex, partnerCard: Card): GameState {
  if (state.phase !== 'callPartner') throw new Error('not in call-partner phase');
  if (!state.highestBid || state.highestBid.seat !== seat) throw new Error('only winning bidder calls partner');
  // Declarer cannot call a card they hold themselves.
  if (state.hands[seat].some((c) => cardEquals(c, partnerCard))) {
    throw new Error('cannot call a card in your own hand');
  }
  const contract: Contract = {
    declarer: seat,
    level: state.highestBid.bid.level,
    trump: state.highestBid.bid.trump,
    partnerCard,
  };
  return {
    ...state,
    phase: 'play',
    contract,
    turn: nextSeat(seat), // opening lead is player to declarer's left
    currentTrick: { leader: nextSeat(seat), cards: [] },
  };
}

export function playCard(state: GameState, seat: SeatIndex, card: Card): GameState {
  if (state.phase !== 'play') throw new Error('not in play phase');
  if (seat !== state.turn) throw new Error('not your turn');
  if (!state.contract) throw new Error('no contract');
  if (!isLegalPlay(state.hands[seat], card, state.currentTrick)) throw new Error('illegal play');

  const newHand = state.hands[seat].filter((c) => !cardEquals(c, card));
  const newHands = state.hands.map((h, i) => (i === seat ? newHand : h));

  const trick: Trick = state.currentTrick ?? { leader: seat, cards: [] };
  const updatedTrick: Trick = { ...trick, cards: [...trick.cards, { seat, card }] };

  // Reveal partner when partner card is played.
  let partnerSeat = state.partnerSeat;
  if (partnerSeat === undefined && cardEquals(card, state.contract.partnerCard)) {
    partnerSeat = seat;
  }

  let next: GameState = {
    ...state,
    hands: newHands,
    currentTrick: updatedTrick,
    partnerSeat,
  };

  if (updatedTrick.cards.length === 4) {
    const winner = trickWinner(updatedTrick, state.contract.trump);
    const completed: Trick = { ...updatedTrick, winner };
    const won = [...state.tricksWonBy] as [number, number, number, number];
    won[winner] += 1;
    next = {
      ...next,
      tricks: [...state.tricks, completed],
      tricksWonBy: won,
      currentTrick: undefined,
      turn: winner,
    };
    if (next.tricks.length === 13) {
      next = scoreDeal(next);
    } else {
      next.currentTrick = { leader: winner, cards: [] };
    }
  } else {
    next.turn = nextSeat(seat);
  }
  return next;
}

function scoreDeal(state: GameState): GameState {
  if (!state.contract) return state;
  const { declarer, level, trump } = state.contract;
  const partner = state.partnerSeat;
  const declarerSide = new Set<SeatIndex>([declarer]);
  if (partner !== undefined) declarerSide.add(partner);

  const declarerTricks =
    state.tricksWonBy[declarer] + (partner !== undefined ? state.tricksWonBy[partner] : 0);
  const need = 6 + level;
  const multiplier = trump === 'NT' ? level + 1 : level;
  const scores = [...state.scores] as [number, number, number, number];

  if (declarerTricks >= need) {
    const over = declarerTricks - 6; // counts all "over book" tricks
    for (const s of declarerSide) scores[s] += multiplier * over;
  } else {
    const short = need - declarerTricks;
    for (let s = 0 as SeatIndex; s < 4; s = ((s + 1) as SeatIndex)) {
      if (!declarerSide.has(s)) scores[s] += multiplier * short;
      if (s === 3) break;
    }
  }
  return { ...state, phase: 'scored', scores };
}

// View tailored to a single seat (hides other players' hands).
export interface PlayerView {
  seat: SeatIndex;
  phase: GameState['phase'];
  dealer: SeatIndex;
  turn: SeatIndex;
  myHand: Card[];
  handCounts: [number, number, number, number];
  bidHistory: BidAction[];
  highestBid?: { seat: SeatIndex; bid: Bid };
  contract?: Contract;
  partnerSeatRevealed?: SeatIndex;
  currentTrick?: Trick;
  tricksWonBy: [number, number, number, number];
  scores: [number, number, number, number];
  lastCompletedTrick?: Trick;
}

export function viewFor(state: GameState, seat: SeatIndex): PlayerView {
  return {
    seat,
    phase: state.phase,
    dealer: state.dealer,
    turn: state.turn,
    myHand: state.hands[seat],
    handCounts: state.hands.map((h) => h.length) as [number, number, number, number],
    bidHistory: state.bidHistory,
    highestBid: state.highestBid,
    contract: state.contract,
    partnerSeatRevealed: state.partnerSeat,
    currentTrick: state.currentTrick,
    tricksWonBy: state.tricksWonBy,
    scores: state.scores,
    lastCompletedTrick: state.tricks[state.tricks.length - 1],
  };
}
