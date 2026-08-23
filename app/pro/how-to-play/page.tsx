import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export default function ProHowToPlayPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-12 sm:py-16">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Racepicks Pro
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl">
            How Racepicks Pro Works
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            A deeper dive into the Team Manager concept — the season-long
            fantasy competition planned alongside the normal Racepicks
            game.
          </p>

          <div className="mt-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
            <p className="text-sm font-bold text-orange-300">
              Racepicks Pro isn&apos;t live yet.
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-300">
              This page describes the current plan so you know what
              you&apos;d be signing up for. Some numbers below are still
              being finalized and are marked as such — nothing here is a
              locked promise until Pro actually launches.
            </p>
          </div>

          <div className="mt-10 space-y-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 leading-7 text-zinc-300 sm:p-10">
            <section>
              <h2 className="text-2xl font-black text-white">
                The Big Idea
              </h2>
              <p className="mt-3">
                Racepicks Pro doesn&apos;t replace the normal Racepicks
                game — it adds a second, deeper championship alongside
                it. You&apos;d still make your regular 1st / 2nd / 3rd /
                Wildcard picks every round exactly as you do now. Pro adds
                a season-long fantasy team you build, manage, and carry
                from Supercross through Pro Motocross and into the SMX
                Playoffs.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                Building Your Team
              </h2>
              <p className="mt-3">
                Each manager owns <strong>5 riders</strong>, in one of two
                legal setups:
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                    Factory Heavy
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    3 Factory · 2 Challenger
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                    Challenger Heavy
                  </p>
                  <p className="mt-2 text-xl font-black text-orange-500">
                    2 Factory · 3 Challenger
                  </p>
                </div>
              </div>
              <p className="mt-4">
                Every team needs at least 2 Factory and 2 Challenger
                riders — you choose which way to lean.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                Factory vs Challenger
              </h2>
              <p className="mt-3">
                Every eligible 450 rider gets classified before the
                season: <strong>Factory</strong> riders are on a genuine
                full-factory program, and <strong>Challenger</strong>{" "}
                covers everyone else — satellite teams, supported riders,
                and independents alike. Classification is locked for the
                relevant stage of the season (SX, then MX, then SMX) and
                doesn&apos;t shift mid-season based on results, even if a
                Challenger temporarily gets a factory bike as an injury
                fill-in.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                Salary Cap
              </h2>
              <p className="mt-3">
                Every manager works within the same salary cap —
                currently a <strong>provisional $31 million</strong>,
                based on internal simulation work but not final until
                it&apos;s run against the real 2027 rider field. Riders
                start the season with a value based on recent form and
                results, weighted toward the most recent season.
              </p>
              <p className="mt-3">
                Rider values move throughout the season — every Monday
                after racing, capped at a maximum of ±5% per adjustment
                so one huge result can&apos;t cause wild price swings.
                Importantly, the salary cap only applies when you&apos;re{" "}
                <em>building or changing</em> your team — if your existing
                team&apos;s value grows past $31M through good picks, you
                don&apos;t have to sell anything.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                Buying, Selling &amp; Transfers
              </h2>
              <p className="mt-3">
                Spotting an undervalued rider is rewarded, but not
                unlimited — if a rider you own increases in value,
                you&apos;d keep <strong>50% of that gain</strong> if you
                sell them. If they drop in value, you absorb the full
                loss. This keeps the focus on genuine team management
                rather than pure salary trading.
              </p>
              <p className="mt-3">
                Transfers are deliberately limited across the season:{" "}
                <strong>3 transfers</strong> for Factory riders and{" "}
                <strong>5 transfers</strong> for Challenger riders. A
                genuinely confirmed multi-race injury can qualify for a
                free injury transfer that doesn&apos;t use up your normal
                allowance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                Team Lock
              </h2>
              <p className="mt-3">
                Your Pro roster locks at the exact same time as your
                normal Racepicks picks each round — no separate deadline
                to track. Once locked, that round&apos;s team is set;
                any transfer you make applies to a future round.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                Scoring — the Basics
              </h2>
              <p className="mt-3">
                Every rider earns points from their official race
                result, plus a <strong>+10 holeshot bonus</strong> per
                race/moto (so a Triple Crown sweep of all three holeshots
                is worth +30 on its own). Challenger riders earn an
                additional performance bonus on top, scaled to reflect
                that their expected finishing position is generally
                further back than a Factory rider&apos;s — the exact
                bonus tables are still being finalized.
              </p>
              <p className="mt-3">
                Supercross, Triple Crown races, and Pro Motocross each
                have slightly different scoring treatment to keep formats
                fairly balanced against each other — for example, Triple
                Crown events score all three races individually rather
                than just the overall, and MX judges Challenger
                performance against a deeper field than SX does. If there
                &apos;s an official classified result, it gets scored
                exactly as classified — no extra penalties layered on top
                for a DNF, and no result means no score for that portion
                of the event.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                SMX Playoff Multipliers
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Playoff 1
                  </p>
                  <p className="mt-2 text-3xl font-black">×1</p>
                </div>
                <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                    Playoff 2
                  </p>
                  <p className="mt-2 text-3xl font-black">×1.5</p>
                </div>
                <div className="rounded-2xl border border-orange-500 bg-orange-500 p-5 text-black">
                  <p className="text-xs font-black uppercase tracking-widest">
                    Final
                  </p>
                  <p className="mt-2 text-3xl font-black">×2</p>
                </div>
              </div>
              <p className="mt-4">
                Championship pressure builds toward the final round, on
                top of separate season-end championship bonuses for SX,
                MX, and the SMX Playoffs (exact bonus values still being
                finalized).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                Pick a Manufacturer
              </h2>
              <p className="mt-3">
                Alongside your 5 riders, you&apos;ll choose{" "}
                <strong>one manufacturer</strong> for the whole season —
                a one-time preseason pick that doesn&apos;t use any of
                your $31M rider budget. Only that manufacturer&apos;s
                best-finishing rider counts each race, so it&apos;s a
                small strategic side-game rather than a second team to
                manage. Manufacturers are grouped into tiers (safer,
                lower-reward brands vs. underdog, higher-reward brands),
                so the choice carries genuine risk and upside without
                ever outweighing good rider management.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                The Pro Leaderboard
              </h2>
              <p className="mt-3">
                Racepicks Pro has its own leaderboard, completely
                separate from the standard Racepicks Championship — so
                you&apos;re tracking two competitions at once, not one
                replacing the other.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white">
                Still Being Finalized
              </h2>
              <p className="mt-3">
                We&apos;d rather be upfront than pretend everything&apos;s
                locked in. The following are still being worked out
                before Pro launches:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Exact finishing-position points tables (SX and MX)</li>
                <li>Exact Challenger bonus tables</li>
                <li>Exact championship bonus values</li>
                <li>
                  Final 2027 rider salaries — can&apos;t be locked until
                  the real 2027 field is known
                </li>
                <li>
                  The $31M salary cap itself — currently a provisional,
                  simulation-backed number
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <Link
              href="/pro"
              className="rounded-full bg-orange-500 px-7 py-3 font-black text-black transition hover:bg-orange-400"
            >
              Back to Racepicks Pro
            </Link>

            <Link
              href="/workshop"
              className="inline-flex items-center gap-2 font-black text-zinc-400 transition hover:text-orange-500"
            >
              <span>←</span>
              <span>Back to Workshop</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}