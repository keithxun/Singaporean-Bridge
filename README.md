# Singaporean Bridge (Online, 4 players)

A web app to play Singapore Bridge with 3 friends. Private room codes, real-time via Socket.IO.

## Rules implemented (v1)

- 52-card deck, 13 cards each, 4 players.
- **Bidding**: clockwise from dealer; bid `level (1–7) + trump (♣ ♦ ♥ ♠ NT)`; each bid must exceed the previous. Three consecutive passes end bidding. Minimum opening bid is 1.
- **Partner call**: the winning bidder names a card (e.g., A♠). Whoever holds that card is the secret partner. They reveal only by playing it.
- **Tricks**: opening lead by player left of declarer. Must follow suit if able; otherwise any card (including trump). Highest trump (or highest of led suit if no trump) wins.
- **Contract success**: declarer side needs `6 + level` tricks. Otherwise defenders win the deal.
- **Scoring (simple)**: declarer side scores `level × tricks_made_over_6` if they make contract; defenders score `level × tricks_short` if not. NT adds +1 to multiplier.

## Stack
- TypeScript monorepo (npm workspaces)
- `packages/shared` — pure game engine + Vitest tests
- `apps/server` — Node + Socket.IO authoritative server
- `apps/web` — Next.js (App Router) + Tailwind client

## Quick start (local)

```
npm install
npm run build:shared
npm run dev
```

Server: http://localhost:4000  ·  Web: http://localhost:3000

### Playing with friends

- **Same Wi-Fi**: start server bound to `0.0.0.0` (default). Friends visit `http://<your-LAN-ip>:3000`.
- **Remote friends**: `cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`.

## Tests

```
npm test
```
