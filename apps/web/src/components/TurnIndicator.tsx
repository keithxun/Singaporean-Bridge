'use client';
import { useEffect } from 'react';
import type { PlayerView } from '@sgb/shared';

const PHASE_VERB: Record<PlayerView['phase'], string> = {
  lobby: 'waiting',
  bidding: 'to bid',
  callPartner: 'to call partner',
  play: 'to play',
  scored: 'deal scored',
};

export function TurnIndicator({ view, names }: { view: PlayerView; names: Record<number, string> }) {
  const myTurn = view.turn === view.seat && view.phase !== 'scored';

  useEffect(() => {
    const base = 'Singaporean Bridge';
    if (!myTurn) {
      document.title = base;
      return;
    }
    let flip = false;
    const id = window.setInterval(() => {
      document.title = flip ? base : '★ Your turn — ' + base;
      flip = !flip;
    }, 1000);
    document.title = '★ Your turn — ' + base;
    return () => {
      window.clearInterval(id);
      document.title = base;
    };
  }, [myTurn]);

  if (view.phase === 'scored') return null;
  const turnName = names[view.turn] ?? `Seat ${view.turn}`;
  return (
    <div
      className={`rounded-lg px-3 md:px-4 py-2 md:py-3 text-center font-semibold text-sm md:text-base transition border-2 ${
        myTurn ? 'bg-gold text-white animate-pulse border-gold' : 'bg-panel text-ink border-wood-dark'
      }`}
    >
      {myTurn ? `Your turn ${PHASE_VERB[view.phase]}` : `${turnName} ${PHASE_VERB[view.phase]}…`}
    </div>
  );
}
