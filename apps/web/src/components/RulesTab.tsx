'use client';

export function RulesTab() {
  return (
    <div className="space-y-4 text-sm">
      <section>
        <h3 className="font-semibold text-emerald-300 mb-2">Setup</h3>
        <ul className="list-disc list-inside space-y-1 text-emerald-100">
          <li>52-card deck; 13 cards dealt to each of 4 players</li>
          <li>Dealer rotates clockwise</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-emerald-300 mb-2">Bidding</h3>
        <ul className="list-disc list-inside space-y-1 text-emerald-100">
          <li>Clockwise from player left of dealer</li>
          <li>Bid = level (1–7) + trump (♣ ♦ ♥ ♠ NT)</li>
          <li>Each bid must exceed the previous</li>
          <li>Pass or bid; three consecutive passes end bidding</li>
          <li>Highest bidder becomes declarer</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-emerald-300 mb-2">Partner Call</h3>
        <ul className="list-disc list-inside space-y-1 text-emerald-100">
          <li>Declarer names a card they <strong>don't hold</strong> (e.g., A♠)</li>
          <li>Whoever has that card becomes the secret partner</li>
          <li>Partner is revealed when they play that card</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-emerald-300 mb-2">Play</h3>
        <ul className="list-disc list-inside space-y-1 text-emerald-100">
          <li>Opening lead: player left of declarer</li>
          <li>Must follow suit if able; otherwise any card</li>
          <li>Highest trump (or highest of led suit) wins the trick</li>
          <li>Trick winner leads next</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-emerald-300 mb-2">Scoring</h3>
        <ul className="list-disc list-inside space-y-1 text-emerald-100">
          <li><strong>Contract target:</strong> 6 + level tricks (e.g., level 3 → need 9 tricks)</li>
          <li><strong>Success:</strong> declarer side scores <strong>level × tricks over 6</strong></li>
          <li><strong>Failure:</strong> defenders score <strong>level × tricks short</strong></li>
          <li><strong>NT bonus:</strong> NT multiplier is <strong>level + 1</strong> instead of level</li>
          <li>Scores accumulate across multiple deals</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-emerald-300 mb-2">Trick Rank (high to low)</h3>
        <div className="bg-emerald-950/50 rounded p-2 text-xs font-mono">
          A K Q J T 9 8 7 6 5 4 3 2
        </div>
      </section>

      <section className="text-emerald-300 text-xs pt-2 border-t border-emerald-700">
        Questions? This is standard Singapore Bridge. Tap "Create room" to play.
      </section>
    </div>
  );
}
