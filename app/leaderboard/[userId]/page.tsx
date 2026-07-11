import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

type PlayerProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type ScoreRow = {
  event_id: string;
  round_points: number;
  first_points: number;
  second_points: number;
  third_points: number;
  wildcard_points: number;
  events:
    | {
        round_number: number;
        venue: string;
        series: string;
        season: number;
        race_date: string;
      }
    | {
        round_number: number;
        venue: string;
        series: string;
        season: number;
        race_date: string;
      }[]
    | null;
};

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

function getEvent(score: ScoreRow) {
  if (Array.isArray(score.events)) {
    return score.events[0] ?? null;
  }

  return score.events;
}

export default async function PlayerHistoryPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  const [
    { data: profile, error: profileError },
    { data: scoreData, error: scoresError },
    { data: leaderboardData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", userId)
      .single(),

    supabase
      .from("scores")
      .select(
        `
          event_id,
          round_points,
          first_points,
          second_points,
          third_points,
          wildcard_points,
          events (
            round_number,
            venue,
            series,
            season,
            race_date
          )
        `
      )
      .eq("user_id", userId),

    supabase
      .from("leaderboard")
      .select(
        `
          user_id,
          total_points,
          rounds_scored,
          best_round
        `
      )
      .order("total_points", { ascending: false }),
  ]);

  if (profileError || !profile) {
    notFound();
  }

  if (scoresError) {
    console.error("Player score history error:", scoresError);
  }

  const player = profile as PlayerProfile;
  const allLeaderboardRows = leaderboardData ?? [];

  const playerPosition =
    allLeaderboardRows.findIndex((row) => row.user_id === userId) + 1;

  const playerSummary = allLeaderboardRows.find(
    (row) => row.user_id === userId
  );

  const scores = ((scoreData ?? []) as ScoreRow[]).sort((a, b) => {
    const eventA = getEvent(a);
    const eventB = getEvent(b);

    return (
      new Date(eventA?.race_date ?? 0).getTime() -
      new Date(eventB?.race_date ?? 0).getTime()
    );
  });

  const totalPoints =
    playerSummary?.total_points ??
    scores.reduce((total, score) => total + score.round_points, 0);

  const bestRound =
    playerSummary?.best_round ??
    Math.max(0, ...scores.map((score) => score.round_points));

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/leaderboard"
          className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to leaderboard
        </Link>

        <div className="mt-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
            Player History
          </p>

          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">
            {player.display_name}
          </h1>

          <p className="mt-3 text-sm text-neutral-400">
            Championship points earned during each completed round.
          </p>
        </div>

        <div className="my-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Position
            </p>

            <p className="mt-2 text-xl font-bold">
              {playerPosition > 0 ? `#${playerPosition}` : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Total Points
            </p>

            <p className="mt-2 text-xl font-bold text-orange-500">
              {totalPoints}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Rounds Scored
            </p>

            <p className="mt-2 text-xl font-bold">{scores.length}</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Best Round
            </p>

            <p className="mt-2 text-xl font-bold">{bestRound} pts</p>
          </div>
        </div>

        {scores.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <h2 className="text-xl font-bold">No completed rounds yet</h2>

            <p className="mt-2 text-sm text-neutral-400">
              This player’s points history will appear after scores are
              calculated.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 bg-black/40 px-6 py-5">
              <h2 className="text-xl font-black uppercase">Round History</h2>
            </div>

            <div className="divide-y divide-neutral-800">
              {scores.map((score) => {
                const event = getEvent(score);

                return (
                  <div
                    key={score.event_id}
                    className="grid gap-5 px-6 py-5 transition hover:bg-neutral-800/40 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                        {event?.series ?? "RacePicks"} · Round{" "}
                        {event?.round_number ?? "—"}
                      </p>

                      <h3 className="mt-1 text-lg font-bold">
                        {event?.venue ?? "Unknown event"}
                      </h3>

                      <p className="mt-1 text-sm text-neutral-500">
                        1st: {score.first_points} · 2nd:{" "}
                        {score.second_points} · 3rd: {score.third_points} ·
                        Wildcard: {score.wildcard_points}
                      </p>
                    </div>

                    <div className="self-center text-left sm:text-right">
                      <p className="text-3xl font-black text-orange-500">
                        {score.round_points}
                      </p>

                      <p className="text-xs uppercase tracking-widest text-neutral-500">
                        points
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}