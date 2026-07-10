import Link from "next/link";
import Countdown from "./components/Countdown";
import Navbar from "./components/Navbar";
import { competitions, getCompetition } from "./data/competitions";
import { races } from "./data/races";

export default function Home() {
  const now = new Date().getTime();

  const upcomingRaces = races
    .filter((race) => new Date(race.pickLock).getTime() > now)
    .sort(
      (firstRace, secondRace) =>
        new Date(firstRace.pickLock).getTime() -
        new Date(secondRace.pickLock).getTime()
    );

  const nextRace = upcomingRaces[0] ?? races[races.length - 1];

  const activeCompetition = getCompetition(nextRace.competitionId);

  const competitionDescriptions: Record<string, string> = {
    supercross: "Stadium racing from January through May.",
    outdoors: "The Pro Motocross outdoor championship.",
    smx: "The season-ending SuperMotocross playoffs.",
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <section
        className="relative min-h-screen overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${nextRace.image})`,
        }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
          <Navbar />

          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.4em] text-orange-500">
              Next Event
            </p>

            <p className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-zinc-300">
              {activeCompetition?.shortName ?? "Racepicks"}
            </p>

            <h1 className="max-w-5xl text-6xl font-black leading-none tracking-tight sm:text-7xl md:text-8xl lg:text-9xl">
              {nextRace.name}
            </h1>

            <p className="mt-6 text-lg font-medium text-zinc-300 md:text-2xl">
              Round {nextRace.round} • {nextRace.location}
            </p>

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

            <div className="mt-8 w-full max-w-3xl rounded-3xl border border-white/15 bg-black/55 px-6 py-8 backdrop-blur-lg md:px-10">
              <p className="mb-6 text-sm font-black uppercase tracking-[0.4em] text-orange-500">
                Picks Close In
              </p>

              <Countdown targetDate={nextRace.pickLock} />
            </div>

            <p className="mt-8 max-w-3xl text-base leading-7 text-zinc-300 md:text-xl">
              Pick your 1st, 2nd and 3rd place riders, then choose the rider
              you believe will finish in the wildcard position. Correct picks
              earn points toward the Racepicks leaderboard.
            </p>

            <div className="mt-8 flex w-full max-w-sm flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href="/picks"
                className="rounded-full bg-orange-500 px-10 py-4 text-center text-lg font-black text-black transition hover:scale-105 hover:bg-orange-400"
              >
                Enter Picks
              </Link>

              <Link
                href="/leaderboard"
                className="rounded-full border border-white/25 bg-black/30 px-10 py-4 text-center text-lg font-black text-white backdrop-blur transition hover:scale-105 hover:bg-white/10"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            2027 Season
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Choose a Competition
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Follow the next event from the homepage or browse each championship
            separately.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {competitions.map((competition) => (
            <div
              key={competition.id}
              className="flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:-translate-y-1 hover:border-orange-500/50"
            >
              <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
                {competition.year}
              </p>

              <h3 className="mt-4 text-3xl font-black">
                {competition.shortName}
              </h3>

              <p className="mt-4 leading-7 text-zinc-400">
                {competitionDescriptions[competition.discipline]}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-6">
                <span className="font-bold text-zinc-300">
                  {competition.roundCount} Rounds
                </span>

                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {competition.status}
                </span>
              </div>

              <Link
                href={`/competitions/${competition.id}`}
                className="mt-8 rounded-full border border-zinc-700 px-6 py-3 text-center font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
              >
                View Competition
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}