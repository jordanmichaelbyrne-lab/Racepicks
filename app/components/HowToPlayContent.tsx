export default function HowToPlayContent() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-black uppercase text-orange-500">
          The Basics
        </h2>

        <p className="mt-3 leading-7 text-zinc-400">
          Each round, pick the riders you think will finish 1st, 2nd
          and 3rd — plus one rider for the Wildcard position. Correct
          picks earn points. The player with the most points at the
          end of the season wins the Championship.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black uppercase text-orange-500">
          Scoring
        </h2>

        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
          <div className="grid grid-cols-2 divide-x divide-zinc-800 border-b border-zinc-800 bg-zinc-900">
            <div className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500">
              Position
            </div>
            <div className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500">
              Points
            </div>
          </div>

          <div className="divide-y divide-zinc-800">
            <div className="grid grid-cols-2 divide-x divide-zinc-800">
              <div className="p-4 font-bold">1st Place</div>
              <div className="p-4 font-black text-orange-500">25 pts</div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-zinc-800">
              <div className="p-4 font-bold">2nd Place</div>
              <div className="p-4 font-black text-orange-500">22 pts</div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-zinc-800">
              <div className="p-4 font-bold">3rd Place</div>
              <div className="p-4 font-black text-orange-500">20 pts</div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-zinc-800">
              <div className="p-4 font-bold">Wildcard</div>
              <div className="p-4 font-black text-orange-500">25 pts</div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-zinc-500">
          A perfect round (all four correct) earns 92 points. Some
          events carry a points multiplier — check the event page for
          details.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black uppercase text-orange-500">
          What&apos;s the Wildcard?
        </h2>

        <p className="mt-3 leading-7 text-zinc-400">
          Before each round, a random finishing position between 7th
          and 15th is chosen as that round&apos;s Wildcard. You pick
          which rider you think will finish in that exact position.
          It changes every round, so it keeps things unpredictable —
          you can&apos;t just pick the same favourites every week.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black uppercase text-orange-500">
          The Weekly Cycle
        </h2>

        <ul className="mt-3 space-y-2 leading-7 text-zinc-400">
          <li>
            <span className="font-bold text-white">Picks open</span> —
            shortly after the previous round&apos;s results are
            published.
          </li>
          <li>
            <span className="font-bold text-white">Picks close</span> —
            before the race weekend begins. Check the countdown timer
            on the homepage.
          </li>
          <li>
            <span className="font-bold text-white">Results published</span>{" "}
            — after the race, usually within a day or two.
          </li>
        </ul>

        <p className="mt-3 leading-7 text-zinc-400">
          If one of your picked riders drops out of the entry list
          before picks close, you&apos;ll get an email and should
          update your picks — otherwise that position won&apos;t
          score any points.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black uppercase text-orange-500">
          The Championship
        </h2>

        <p className="mt-3 leading-7 text-zinc-400">
          Points earned each round add up across the whole season.
          Check the Championship page anytime to see the full
          standings, and click any player to see their pick history.
        </p>
      </section>
    </div>
  );
}