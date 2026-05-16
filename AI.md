# Singaporean Bridge AI Strategy

This document explains how the AI bots play Singaporean Bridge.

## Overview

The AI operates in three phases:
1. **Bidding** - Determining what level to bid and which suit (trump)
2. **Partner Calling** - Selecting a card to call as partner
3. **Card Play** - Playing cards strategically during the trick phase

---

## 1. Bidding Strategy

### Point Counting

Points are calculated using standard bridge values with a distribution bonus:

```
Card Values:
- Ace = 4 points
- King = 3 points
- Queen = 2 points
- Jack = 1 point

Distribution Bonus:
- +1 point per long suit (5+ cards)
```

**Example:** 
- Hand with A♠, K♥, Q♦, 7♣, 6♣, 5♣, 4♣, 3♣, 2♣, and other low cards
- High card points: 4 + 3 + 2 = 9
- Distribution: Clubs suit has 7 cards (5+ cards) = +1
- **Total: 10 points**

### Bid Level Selection

The AI calculates its optimal bid level based on point total:

```
20+ points → Bid Level 3
17-19 points → Bid Level 2
13-16 points → Bid Level 1
<13 points → Pass
```

### Trump Suit Selection

The AI chooses trump by analyzing point strength in each suit:

```
1. Calculate points in each suit separately
2. Choose suit with highest point total
3. Tiebreaker: longest suit (most cards)
```

**Example:**
- Spades: A♠, K♠, 5♠ = 7 points, 3 cards
- Hearts: Q♥, J♥, 9♥, 8♥ = 3 points, 4 cards
- Diamonds: A♦, 4♦ = 4 points, 2 cards
- Clubs: K♣, 7♣, 6♣ = 3 points, 3 cards
- **Trump choice: Spades** (highest points)

### Responding to Existing Bid

When another player has already bid, the AI uses a competitive strategy:

```
1. Calculate what bid level AI would make with its own points
2. If calculated level > current highest bid level → Outbid
3. Otherwise → Pass
```

This creates natural competition without forcing artificial bidding.

**Example:**
- Current highest bid: Level 2 (needs 17+ points to open)
- AI has 18 points
  - Calculated level: 2 (17-19 points range)
  - 2 is NOT > 2 → Pass
- AI has 20 points
  - Calculated level: 3 (20+ points range)
  - 3 > 2 → Outbid with Level 3

---

## 2. Partner Calling Strategy

The AI simply picks a random card that is not in its hand. This is basic but functional - future improvements could:
- Pick cards that partner likely doesn't have
- Consider suit distribution
- Strategic card selection based on hand strength

---

## 3. Card Play Strategy

### Core Decision Tree

When it's the AI's turn to play:

```
1. CAN FOLLOW SUIT?
   ├─ YES → Play highest card of led suit
   └─ NO → Continue to step 2

2. IS PARTNER CONFIRMED?
   ├─ NO → Play normally (own strategy)
   └─ YES → Consider partner assistance (step 3)

3. DOES PARTNER HAVE ACE (HIGHEST CARD)?
   ├─ YES & PARTNER WINNING → Don't trump, play low off-suit
   └─ NO → Continue to step 4

4. CAN I BEAT CURRENT WINNER?
   ├─ YES → Play lowest trump (minimize waste)
   ├─ NO & PARTNER WINNING → Play off-suit
   └─ NO & OPPONENT WINNING → Play lowest trump
```

### Opening Lead (No Tricks Played Yet)

```
IF partner is confirmed:
  - Detect which suit partner is missing
  - Lead that suit (so partner can trump it)
  - Play highest card in that suit

IF partner not confirmed:
  - Play highest legal card
```

### Following Suit

```
IF led suit cards available:
  - Play highest card of led suit
  - (Follow standard bridge convention)
```

### Cannot Follow Suit

```
IF partner has highest card AND partner is winning:
  - Play off-suit (don't waste trump)
  ELSE:
  - Consider trumping:
    - If can beat current winner → play lowest trump
    - If opponent winning → play lowest trump
    - If partner winning → play off-suit if available
    
IF no good option:
  - Play smallest card (minimize loss)
```

### Partner Detection

The AI detects when partner has run out of a suit by analyzing trick history:

```
For each completed trick:
  1. Identify which suit was led
  2. Check what partner played
  3. If partner didn't follow suit → Partner is out of that suit
  
Result: Can "feed" that suit on opening lead
```

**Example:**
- Trick 1: West leads ♠5, Partner (North) plays ♦K (not spades)
- **Inference: Partner has no Spades left**
- AI (South) can now lead spades on opening lead to help partner trump

### Difficulty Modes

- **Random**: Plays random legal card (ignores all strategy)
- **Smart**: Uses full decision tree above

---

## Summary of AI Behavior

### Strengths
✅ Reasonable point counting with distribution bonus  
✅ Competitive bidding (not predictable)  
✅ Partner cooperation when partnership confirmed  
✅ Avoids wasting high cards on unwinnable tricks  
✅ Feeds partner suits they're missing  
✅ Protects partner's winning cards  

### Current Limitations
❌ Partner calling is random (not strategic)  
❌ Doesn't count opponent cards  
❌ Doesn't plan multiple tricks ahead  
❌ Doesn't consider risk vs. reward in edge cases  

---

## Code Structure

**File:** `apps/server/src/bot.ts`

Key functions:
- `countPoints(hand)` - Calculate hand value with distribution bonus
- `bestSuit(hand)` - Select trump suit by point analysis
- `botBid(view, difficulty)` - Bidding logic
- `botCallPartner(hand)` - Partner card selection
- `botPlay(view, hand, difficulty)` - Card play logic
- `getPartnerMissingSuits(view)` - Detect suits partner is missing
- `winnerOfTrick(trick, trump)` - Evaluate trick winner
- `leadCard(hand)` - Select opening lead card

