import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "../../components/Navbar";
import {
  competitions,
  getCompetition,
} from "../../data/competitions";
import { races } from "../../data/races";
import { getMaximumRoundPoints } from "../../data/scoring";

type CompetitionPageProps = {
  params: Promise<{
    competitionId: string;
  }>;
};

export function generateStaticParams() {
  return competitions.map((competition) => ({
    competitionId: competition.id,
  }));
}

export default async function CompetitionPage({
  params,
}: CompetitionPageProps) {
  const { competitionId } = await params;

  const competition = getCompetition(competitionId);

  if (!competition) {
    notFound();
  }

  const competitionRaces = races.filter(
    (race) => race.competitionId === competition.id
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="py-16">
          <Link
            href="/"
            className="text-sm font-bold text-zinc-400 transition hover:text-white"
          >
            ← Back to homepage
          </Link>

          <p className="mt-10 text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            {competition.year} Season
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
            {competition.name}
          </h1>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300">
              {competition.roundCount} Rounds
            </span>

            <span className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold capitalize text-zinc-300">
              {competition.status}
            </span>

            <span className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300">
              {competition.entryFee === 0
                ? "Free Entry"
                : `$${competition.entryFee} Entry`}
            </span>
          </div>

          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-500">
              Scoring
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-500">1st Place</p>
                <p className="mt-2 text-3xl font-black">25 pts</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-500">2nd Place</p>
                <p className="mt-2 text-3xl font-black">22 pts</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-500">3rd Place</p>
                <p className="mt-2 text-3xl font-black">20 pts</p>
              </div>

              <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5">
                <p className="text-sm text-orange-400">Wildcard</p>
                <p className="mt-2 text-3xl font-black">25 pts</p>
              </div>
            </div>

            {competition.discipline === "smx" && (
              <p className="mt-6 text-zinc-400">
                SMX Playoff 1 uses standard scoring, Playoff 2 uses a 1.5×
                multiplier, and the SMX Final uses a 2× multiplier. Half-point
                results are rounded up to the nearest whole point.
              </p>
            )}
          </div>

          {competitionRaces.length > 0 ? (
            <div className="mt-12 grid gap-5">
              {competitionRaces.map((race) => (
                <div
                  key={`${race.competitionId}-${race.round}`}
                  className="grid gap-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:grid-cols-[100px_1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Round
                    </p>

                    <p className="mt-1 text-4xl font-black">{race.round}</p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black">{race.name}</h2>

                    <p className="mt-2 text-zinc-400">
                      {race.location} • {race.raceDate}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-300">
                        {race.pointsMultiplier}× Multiplier
                      </span>

                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-300">
                        {getMaximumRoundPoints(race.pointsMultiplier)} Max Points
                      </span>

                      {race.estimated && (
                        <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400">
                          Estimated Schedule
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                      Wildcard
                    </p>

                    <p className="mt-1 text-3xl font-black">
                      {race.wildcardPosition}th
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
              <h2 className="text-3xl font-black">Schedule coming soon</h2>

              <p className="mx-auto mt-4 max-w-xl text-zinc-400">
                The official 2027 schedule has not been added yet.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}