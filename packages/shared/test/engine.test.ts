import { describe, expect, it } from 'vitest';
import {
  applyBid,
  callPartner,
  cardEquals,
  createDeck,
  deal,
  isHigherBid,
  playCard,
  startGame,
  trickWinner,
  type Card,
  type SeatIndex,
} from '../src/index.js';

describe('deck', () => {
  it('creates 52 unique cards', () => {
    const d = createDeck();
    expect(d.length).toBe(52);
    const codes = new Set(d.map((c) => `${c.rank}${c.suit}`));
    expect(codes.size).toBe(52);
  });

  it('deals 13 cards to each of 4 players', () => {
    const hands = deal(42);
    expect(hands.length).toBe(4);
    for (const h of hands) expect(h.length).toBe(13);
    const all = hands.flat();
    expect(new Set(all.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });

  it('deal with same seed is deterministic', () => {
    const a = deal(7);
    const b = deal(7);
    expect(a.flat().map((c) => `${c.rank}${c.suit}`)).toEqual(b.flat().map((c) => `${c.rank}${c.suit}`));
  });
});

describe('bidding ordering', () => {
  it('higher level always beats lower level', () => {
    expect(isHigherBid({ level: 2, trump: 'C' }, { level: 1, trump: 'NT' })).toBe(true);
  });
  it('NT beats spades at same level', () => {
    expect(isHigherBid({ level: 3, trump: 'NT' }, { level: 3, trump: 'S' })).toBe(true);
  });
  it('clubs is lowest', () => {
    expect(isHigherBid({ level: 1, trump: 'D' }, { level: 1, trump: 'C' })).toBe(true);
    expect(isHigherBid({ level: 1, trump: 'C' }, { level: 1, trump: 'D' })).toBe(false);
  });
});

describe('trick resolution', () => {
  const card = (rank: string, suit: string): Card => ({ rank: rank as any, suit: suit as any });

  it('highest of led suit wins when no trumps played', () => {
    const t = {
      leader: 0 as SeatIndex,
      cards: [
        { seat: 0 as SeatIndex, card: card('A', 'H') },
        { seat: 1 as SeatIndex, card: card('K', 'H') },
        { seat: 2 as SeatIndex, card: card('2', 'H') },
        { seat: 3 as SeatIndex, card: card('5', 'C') },
      ],
    };
    expect(trickWinner(t, 'S')).toBe(0);
  });

  it('any trump beats highest of led suit', () => {
    const t = {
      leader: 0 as SeatIndex,
      cards: [
        { seat: 0 as SeatIndex, card: card('A', 'H') },
        { seat: 1 as SeatIndex, card: card('2', 'S') },
        { seat: 2 as SeatIndex, card: card('K', 'H') },
        { seat: 3 as SeatIndex, card: card('Q', 'H') },
      ],
    };
    expect(trickWinner(t, 'S')).toBe(1);
  });

  it('higher trump wins when multiple trumps played', () => {
    const t = {
      leader: 0 as SeatIndex,
      cards: [
        { seat: 0 as SeatIndex, card: card('A', 'H') },
        { seat: 1 as SeatIndex, card: card('2', 'S') },
        { seat: 2 as SeatIndex, card: card('5', 'S') },
        { seat: 3 as SeatIndex, card: card('K', 'H') },
      ],
    };
    expect(trickWinner(t, 'S')).toBe(2);
  });

  it('NT contract: only led suit counts', () => {
    const t = {
      leader: 0 as SeatIndex,
      cards: [
        { seat: 0 as SeatIndex, card: card('A', 'H') },
        { seat: 1 as SeatIndex, card: card('K', 'S') },
        { seat: 2 as SeatIndex, card: card('Q', 'D') },
        { seat: 3 as SeatIndex, card: card('2', 'H') },
      ],
    };
    expect(trickWinner(t, 'NT')).toBe(0);
  });
});

describe('game flow', () => {
  it('runs bidding → callPartner → play → scored', () => {
    let s = startGame(0, 123);
    // seat 1 opens, seat 2 raises, seats 3, 0, 1 pass
    s = applyBid(s, { seat: 1, bid: { level: 1, trump: 'S' } });
    s = applyBid(s, { seat: 2, bid: { level: 2, trump: 'H' } });
    s = applyBid(s, { seat: 3, bid: 'pass' });
    s = applyBid(s, { seat: 0, bid: 'pass' });
    s = applyBid(s, { seat: 1, bid: 'pass' });
    expect(s.phase).toBe('callPartner');
    expect(s.highestBid?.seat).toBe(2);

    // declarer (seat 2) calls a card not in their hand
    const declarerHand = s.hands[2];
    const allCards = createDeck();
    const partnerCard = allCards.find((c) => !declarerHand.some((h) => cardEquals(h, c)))!;
    s = callPartner(s, 2, partnerCard);
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(3); // left of declarer

    // play out all 13 tricks
    let safety = 60;
    while (s.phase === 'play' && safety-- > 0) {
      const hand = s.hands[s.turn];
      // pick a legal card: first card matching led suit if must follow, else any
      const led = s.currentTrick && s.currentTrick.cards[0]?.card.suit;
      const choice = led ? hand.find((c) => c.suit === led) ?? hand[0] : hand[0];
      s = playCard(s, s.turn, choice);
    }
    expect(s.phase).toBe('scored');
    const totalTricks = s.tricksWonBy.reduce((a, b) => a + b, 0);
    expect(totalTricks).toBe(13);
  });

  it('rejects out-of-turn bids', () => {
    const s = startGame(0, 1);
    expect(() => applyBid(s, { seat: 2, bid: 'pass' })).toThrow();
  });

  it('rejects non-increasing bids', () => {
    let s = startGame(0, 1);
    s = applyBid(s, { seat: 1, bid: { level: 3, trump: 'H' } });
    expect(() => applyBid(s, { seat: 2, bid: { level: 2, trump: 'S' } })).toThrow();
  });

  it('declarer cannot call a card in own hand', () => {
    let s = startGame(0, 5);
    s = applyBid(s, { seat: 1, bid: { level: 1, trump: 'S' } });
    s = applyBid(s, { seat: 2, bid: 'pass' });
    s = applyBid(s, { seat: 3, bid: 'pass' });
    s = applyBid(s, { seat: 0, bid: 'pass' });
    const own = s.hands[1][0];
    expect(() => callPartner(s, 1, own)).toThrow();
  });
});
