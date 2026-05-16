export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Trump = Suit | 'NT';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type SeatIndex = 0 | 1 | 2 | 3;

export interface Bid {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  trump: Trump;
}

export interface BidAction {
  seat: SeatIndex;
  bid: Bid | 'pass';
}

export interface Contract {
  declarer: SeatIndex;
  level: Bid['level'];
  trump: Trump;
  partnerCard: Card;
}

export type Phase = 'lobby' | 'bidding' | 'callPartner' | 'play' | 'scored';

export interface Trick {
  leader: SeatIndex;
  cards: { seat: SeatIndex; card: Card }[];
  winner?: SeatIndex;
}

export interface ChatMessage {
  playerId: string;
  name: string;
  text: string;
  timestamp: number;
}

export interface GameState {
  phase: Phase;
  dealer: SeatIndex;
  turn: SeatIndex;
  hands: Card[][]; // index by SeatIndex
  bidHistory: BidAction[];
  highestBid?: { seat: SeatIndex; bid: Bid };
  consecutivePasses: number;
  contract?: Contract;
  partnerSeat?: SeatIndex; // revealed when partner card is played
  tricks: Trick[];
  currentTrick?: Trick;
  tricksWonBy: [number, number, number, number]; // per seat
  scores: [number, number, number, number]; // running totals per seat
  trumpBroken: boolean; // whether trump has been played in a trick
}
