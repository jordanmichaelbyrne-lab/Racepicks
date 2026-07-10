import Countdown from "./components/Countdown";
import Navbar from "./components/Navbar";
import { races } from "./data/races";
import Link from "next/link";


export default function Home() {
  const nextRace = races[0];

  return (
    <main className="min-h-screen bg-black text-white">
      <section
        className="relative min-h-screen overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${nextRace.image})`,
        }}
      >
        {/* Dark image overlays */}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black" />

        {/* Page content */}
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
          <Navbar />

          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="mb-4 text-sm font-black uppercase tracking-[0.45em] text-orange-500">
              Next Round
            </p>

            <h1 className="max-w-5xl text-6xl font-black leading-none tracking-tight sm:text-7xl md:text-8xl lg:text-9xl">
              {nextRace.name}
            </h1>

            <p className="mt-6 text-lg font-medium text-zinc-300 md:text-2xl">
              Round {nextRace.round} • {nextRace.location}
            </p>

            {/* Race information cards */}
            <div className="mt-10 grid w-full max-w-5xl gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/15 bg-black/45 p-6 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                  Race Date
                </p>

                <p className="mt-3 text-2xl font-black">
                  {nextRace.raceDate}
                </p>
              </div>

              <div className="rounded-3xl border border-orange-500/60 bg-orange-500/15 p-6 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">
                  Wildcard Position
                </p>

                <p className="mt-3 text-5xl font-black">
                  {nextRace.wildcardPosition}th
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-black/45 p-6 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                  Picks Close
                </p>

                <p className="mt-3 text-2xl font-black">
                  {nextRace.pickLockDisplay}
                </p>
              </div>
            </div>

            {/* Countdown */}
            <div className="mt-8 w-full max-w-3xl rounded-3xl border border-white/15 bg-black/55 px-6 py-8 backdrop-blur-lg md:px-10">
              <p className="mb-6 text-sm font-black uppercase tracking-[0.4em] text-orange-500">
                Picks Close In
              </p>

              <Countdown targetDate={nextRace.pickLock} />
            </div>

            {/* Description */}
            <p className="mt-8 max-w-3xl text-base leading-7 text-zinc-300 md:text-xl">
              Pick your 1st, 2nd and 3rd place riders, then choose the rider
              you believe will finish in the wildcard position. Correct picks
              earn points toward the Racepicks World Leaderboard.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex w-full max-w-sm flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
              href="/picks"
               className="rounded-full bg-orange-500 px-10 py-4 text-center text-lg font-black text-black transition hover:scale-105 hover:bg-orange-400"
>
                Enter Picks
              </Link>

              <button className="rounded-full border border-white/25 bg-black/30 px-10 py-4 text-lg font-black text-white backdrop-blur transition hover:scale-105 hover:bg-white/10">
                View Leaderboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Homepage preview sections */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-3">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-500">
            Competition
          </p>

          <h2 className="mt-4 text-3xl font-black">
            World Leaderboard
          </h2>

          <p className="mt-4 leading-7 text-zinc-400">
            Compete against every Racepicks player across the season and climb
            the overall standings.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-500">
            Championship
          </p>

          <h2 className="mt-4 text-3xl font-black">
            450 Pro Points
          </h2>

          <p className="mt-4 leading-7 text-zinc-400">
            Follow the latest championship points, rider form and round-by-round
            results.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-500">
            Latest
          </p>

          <h2 className="mt-4 text-3xl font-black">
            Motocross News
          </h2>

          <p className="mt-4 leading-7 text-zinc-400">
            Stay updated with the latest rider news, injuries, team changes and
            race-weekend developments.
          </p>
        </div>
      </section>
    </main>
  );
}