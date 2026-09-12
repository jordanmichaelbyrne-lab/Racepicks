import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSeason } from "@/app/lib/current-season";
import Navbar from "@/app/components/Navbar";

type EventRow = {
  competition_slug: string;
  series: string;
  season: number;
  race_date: string;
  status: string;
};

type CompetitionSummary = {
  slug: string;
  series: string;
  season: number;
  roundCount: number;
  allCompleted: boolean;
};

function formatCompetitionTitle(season: number, series: string) {
  if (series === "Motocross") return `${season} Pro Motocross`;
  if (series === "Supercross") return `${season} Supercross`;
  if (series === "SMX") return `${season} SMX Championship`;
  return `${season} ${series}`;
}

function formatSeriesDescription(series: string) {
  if (series === "Motocross") return "The Pro Motocross outdoor championship.";
  if (series === "Supercross") return "Stadium racing from January through May.";
  if (series === "SMX") return "The season-ending SuperMotocross playoffs.";
  return "A past Racepicks championship.";
}

export default async function LeaderboardHistoryPage() {
  const supabase = await createClient();

  const currentSeason = await getCurrentSeason(supabase);

  const { data: eventRows, error } = await supabase
    .from("events")
    .select("competition_slug, series, season, race_date, status")
    .order("race_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (eventRows ?? []) as EventRow[];

  const summaryBySlug = new Map<string, CompetitionSummary>();

  for (const row of rows) {
    const existing = summaryBySlug.get(row.competition_slug);

    if (existing) {
      existing.roundCount += 1;
      existing.allCompleted =
        existing.allCompleted && row.status === "completed";
    } else {
      summaryBySlug.set(row.competition_slug, {
        slug: row.competition_slug,
        series: row.series,
        season: row.season,
        roundCount: 1,
        allCompleted: row.status === "completed",
      });
    }
  }

  // Only genuinely past seasons — the current season's own
  // competitions stay on the main /leaderboard tab row, not here.
  const pastCompetitions = Array.from(summaryBySlug.values()).filter(
    (competition) =>
      currentSeason === null || competition.season < currentSeason
  );

  const seasonsDescending = Array.from(
    new Set(pastCompetitions.map((competition) => competition.season))
  ).sort((a, b) => b - a);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-12 sm:py-16">
          <Link
            href="/leaderboard"
            className="inline-block text-sm font-bold text-neutral-400 transition hover:text-orange-500"
          >
            ← Back to Leaderboard
          </Link>

          <header className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
              Racepicks Archive
            </p>

            <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
              Championship History
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              Browse every past Racepicks season and revisit how each
              championship played out.
            </p>
          </header>

          {seasonsDescending.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900 p-10 text-center">
              <h2 className="text-xl font-bold">No past seasons yet</h2>
              <p className="mt-2 text-sm text-neutral-400">
                History will appear here once a season wraps and a new
                one begins.
              </p>
            </div>
          ) : (
            seasonsDescending.map((season) => {
              const competitionsThisSeason = pastCompetitions
                .filter((competition) => competition.season === season)
                .sort((a, b) => a.series.localeCompare(b.series));

              return (
                <section key={season} className="mt-12">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                    {season} Season
                  </p>

                  <div className="mt-5 grid gap-5 md:grid-cols-3">
                    {competitionsThisSeason.map((competition) => (
                      <div
                        key={competition.slug}
                        className="flex flex-col rounded-3xl border border-neutral-800 bg-neutral-900 p-7 transition hover:-translate-y-1 hover:border-orange-500/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-2xl font-black">
                            {formatCompetitionTitle(
                              competition.season,
                              competition.series
                            )}
                          </h3>

                          {competition.allCompleted && (
                            <span className="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase text-blue-400">
                              Completed
                            </span>
                          )}
                        </div>

                        <p className="mt-3 flex-1 text-sm leading-6 text-neutral-400">
                          {formatSeriesDescription(competition.series)}
                        </p>

                        <p className="mt-4 text-sm font-bold text-neutral-300">
                          {competition.roundCount} round
                          {competition.roundCount === 1 ? "" : "s"}
                        </p>

                        <Link
                          href={`/competitions/${competition.slug}`}
                          className="mt-6 rounded-full border border-neutral-700 px-5 py-3 text-center font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
                        >
                          View Standings
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}