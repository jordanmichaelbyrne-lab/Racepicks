import Link from "next/link";
import ProPollForm from "./ProPollForm";

const proFeatures = [
  {
    title: "5 Rider Team",
    description:
      "Build a five-rider fantasy team using either 3 Factory + 2 Challenger or 2 Factory + 3 Challenger.",
  },
  {
    title: "$31M Salary Cap",
    description:
      "Every rider has a value. Build smart, find value and manage your budget across the full season.",
  },
  {
    title: "Dynamic Rider Values",
    description:
      "Rider salaries can rise or fall on Mondays based on recent performance and form.",
  },
  {
    title: "Limited Transfers",
    description:
      "3 Primary transfers, 5 Challenger transfers, plus free injury replacements when eligible.",
  },
  {
    title: "Manufacturer Pick",
    description:
      "Choose one bike manufacturer for the entire SMX season and earn small performance bonuses.",
  },
  {
    title: "Full SMX Season",
    description:
      "Supercross, Triple Crowns, Pro Motocross and all three SMX Playoff rounds count toward one championship.",
  },
];

const scoringFeatures = [
  "Race finishing points",
  "Challenger performance bonuses",
  "+10 for every holeshot",
  "Triple Crown race scoring",
  "Moto + overall scoring in Pro Motocross",
  "SMX Playoff multipliers",
  "SX, MX and SMX championship bonuses",
  "Small manufacturer bonus system",
];

export default function ProLandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-black tracking-tight text-white sm:text-3xl"
          >
            Racepicks<span className="text-orange-500">.</span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-orange-500 hover:text-orange-500"
          >
            Back Home
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-orange-500/20 bg-zinc-950 px-6 py-16 text-center sm:mt-8 sm:px-10 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_40%)]" />

          <div className="relative">
            <span className="inline-flex rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-orange-400">
              Coming 2027
            </span>

            <p className="mt-8 text-sm font-black uppercase tracking-[0.35em] text-orange-500">
              Racepicks Pro
            </p>

            <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-7xl lg:text-8xl">
              Team Manager
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-400 sm:text-xl">
              Build your own five-rider race team. Manage the salary cap.
              Make strategic transfers. Compete across the entire
              SuperMotocross season.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <span className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black uppercase text-black">
                5 Riders
              </span>

              <span className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-black uppercase text-white">
                $31M Cap
              </span>

              <span className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-black uppercase text-white">
                Full SMX Season
              </span>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {proFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
                Pro Feature
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase">
                {feature.title}
              </h2>

              <p className="mt-3 leading-7 text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
              Build Your Team
            </p>

            <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
              Your Factory. Your Riders.
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
              Choose five riders and decide whether to build around factory
              firepower or take a bigger swing on Challenger value.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                  Factory Heavy
                </p>

                <p className="mt-2 text-2xl font-black text-white">
                  3 Factory
                </p>

                <p className="text-lg font-black text-orange-500">
                  2 Challenger
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                  Challenger Heavy
                </p>

                <p className="mt-2 text-2xl font-black text-white">
                  2 Factory
                </p>

                <p className="text-lg font-black text-orange-500">
                  3 Challenger
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-500/30 bg-orange-500/5 p-7 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Example Team
                </p>

                <h2 className="mt-3 text-3xl font-black uppercase">
                  Byrne Racing
                </h2>
              </div>

              <span className="rounded-full bg-orange-500 px-3 py-2 text-xs font-black uppercase text-black">
                Pro
              </span>
            </div>

            <div className="mt-8 space-y-4">
              {[
                ["Rider 01", "Factory"],
                ["Rider 02", "Factory"],
                ["Rider 03", "Challenger"],
                ["Rider 04", "Challenger"],
                ["Rider 05", "Challenger"],
              ].map(([rider, type]) => (
                <div
                  key={rider}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/60 px-4 py-4"
                >
                  <span className="font-black">{rider}</span>

                  <span
                    className={`text-xs font-black uppercase tracking-wider ${
                      type === "Factory"
                        ? "text-white"
                        : "text-orange-500"
                    }`}
                  >
                    {type}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/60 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  Team Value
                </p>

                <p className="mt-2 text-xl font-black">$30.6M</p>
              </div>

              <div className="rounded-2xl bg-black/60 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  Manufacturer
                </p>

                <p className="mt-2 text-xl font-black text-orange-500">
                  KTM
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Scoring
          </p>

          <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
            Every Round Matters
          </h2>

          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            The Pro championship runs from the opening Supercross round
            through Pro Motocross and all the way to the final SMX Playoff.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scoringFeatures.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-zinc-800 bg-black px-4 py-4 font-bold"
              >
                <span className="mr-2 text-orange-500">+</span>
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                SMX Playoff 1
              </p>

              <p className="mt-2 text-3xl font-black">×1</p>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                SMX Playoff 2
              </p>

              <p className="mt-2 text-3xl font-black">×1.5</p>
            </div>

            <div className="rounded-2xl border border-orange-500 bg-orange-500 p-5 text-black">
              <p className="text-xs font-black uppercase tracking-widest">
                SMX Final
              </p>

              <p className="mt-2 text-3xl font-black">×2</p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-orange-500/30 bg-orange-500/10 p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Important
          </p>

          <h2 className="mt-3 text-3xl font-black uppercase">
            You Still Play Racepicks.
          </h2>

          <p className="mt-4 max-w-4xl leading-7 text-zinc-300">
            Racepicks Pro does not replace the normal Championship. Pro
            subscribers still make their regular 1st, 2nd, 3rd and Wildcard
            picks and compete on the main Racepicks leaderboard.
          </p>

          <p className="mt-3 max-w-4xl leading-7 text-zinc-400">
            Team Manager is a second competition running alongside it, with
            deeper strategy, its own leaderboard and larger prize pools
            planned.
          </p>
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 text-center sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Want the full details first?
          </p>

          <h2 className="mt-3 text-2xl font-black uppercase sm:text-3xl">
            Read How Racepicks Pro Works
          </h2>

          <p className="mx-auto mt-3 max-w-xl leading-7 text-zinc-400">
            Team structure, salary cap, transfers, scoring — the complete
            breakdown of the plan before you vote below.
          </p>

          <Link
            href="/pro/how-to-play"
            className="mt-6 inline-block rounded-full border border-orange-500 px-7 py-3 font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
          >
            Read the Full Rules
          </Link>
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-7 sm:p-10">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
              Help Shape Racepicks Pro
            </p>

            <h2 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
              Would You Play?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl leading-7 text-zinc-400">
              We&apos;re testing interest before launching the full 2027 Pro
              competition.
            </p>
          </div>

          <ProPollForm />
        </section>

        <footer className="py-12 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-500">
            Racepicks Pro
          </p>

          <p className="mt-3 text-sm text-zinc-500">
            Team Manager · Coming 2027
          </p>
        </footer>
      </div>
    </main>
  );
}