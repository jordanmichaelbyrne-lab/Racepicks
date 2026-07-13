import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

type PlayerProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type LeaderboardRow = {
  user_id: string;
  total_points: number;
  rounds_scored: number;
  best_round: number;
};

type EventDetails = {
  round_number: number;
  venue: string;
  series: string;
  season: number;
  race_date: string;
};

type ScoreRow = {
  event_id: string;
  round_points: number;
  first_points: number;
  second_points: number;
  third_points: number;
  wildcard_points: number;
  events: EventDetails | EventDetails[] | null;
};

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

function getEvent(score: ScoreRow): EventDetails | null {
  if (Array.isArray(score.events)) {
    return score.events[0] ?? null;
  }

  return score.events;
}

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getPositionLabel(position: number) {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";

  return `${position}th`;
}

export default async function PlayerHistoryPage({
  params,
}: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  const [
    { data: profile, error: profileError },
    { data: scoreData, error: scoresError },
    { data: leaderboardData, error: leaderboardError },
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
      .order("total_points", { ascending: false })
      .order("user_id", { ascending: true }),
  ]);

  if (profileError || !profile) {
    notFound();
  }

  if (scoresError) {
    console.error("Player score history error:", scoresError);
  }

  if (leaderboardError) {
    console.error("Leaderboard loading error:", leaderboardError);
  }

  const player = profile as PlayerProfile;
  const leaderboardRows =
    (leaderboardData ?? []) as LeaderboardRow[];

  const scores = ((scoreData ?? []) as ScoreRow[]).sort((a, b) => {
    const eventA = getEvent(a);
    const eventB = getEvent(b);

    return (
      new Date(eventA?.race_date ?? 0).getTime() -
      new Date(eventB?.race_date ?? 0).getTime()
    );
  });

  const playerSummary = leaderboardRows.find(
    (row) => row.user_id === userId
  );

  const playerIndex = leaderboardRows.findIndex(
    (row) => row.user_id === userId
  );

  const playerPosition = playerIndex >= 0 ? playerIndex + 1 : 0;

  const totalPoints =
    playerSummary?.total_points ??
    scores.reduce((total, score) => total + score.round_points, 0);

  const roundsScored =
    playerSummary?.rounds_scored ?? scores.length;

  const bestRound =
    playerSummary?.best_round ??
    Math.max(0, ...scores.map((score) => score.round_points));

  const averageRound =
    roundsScored > 0
      ? Math.round((totalPoints / roundsScored) * 10) / 10
      : 0;

  const perfectRounds = scores.filter(
    (score) =>
      score.first_points === 25 &&
      score.second_points === 22 &&
      score.third_points === 20 &&
      score.wildcard_points === 25
  ).length;

  const correctPodiumPicks = scores.reduce(
    (total, score) =>
      total +
      Number(score.first_points > 0) +
      Number(score.second_points > 0) +
      Number(score.third_points > 0),
    0
  );

  const wildcardHits = scores.filter(
    (score) => score.wildcard_points > 0
  ).length;

  const initials =
    getInitials(player.display_name) || "RP";

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/leaderboard"
          className="inline-block text-sm font-bold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to Leaderboard
        </Link>

        <section className="mt-8 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 bg-black/30 p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
              Race Card
            </p>

            <div className="mt-5 flex items-center gap-5">
              {player.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.avatar_url}
                  alt={player.display_name}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-black text-black">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="truncate text-3xl font-black uppercase tracking-tight sm:text-5xl">
                  {player.display_name}
                </h1>

                <p className="mt-2 text-sm text-neutral-400">
                  RacePicks championship history
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-neutral-800 sm:grid-cols-4">
            <div className="bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Position
              </p>

              <p className="mt-2 text-2xl font-black">
                {playerPosition > 0
                  ? getPositionLabel(playerPosition)
                  : "—"}
              </p>
            </div>

            <div className="bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Total Points
              </p>

              <p className="mt-2 text-2xl font-black text-orange-500">
                {totalPoints}
              </p>
            </div>

            <div className="bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Rounds
              </p>

              <p className="mt-2 text-2xl font-black">
                {roundsScored}
              </p>
            </div>

            <div className="bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Best Round
              </p>

              <p className="mt-2 text-2xl font-black">
                {bestRound} pts
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Average
            </p>

            <p className="mt-2 text-xl font-black">
              {averageRound} pts
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Podium Hits
            </p>

            <p className="mt-2 text-xl font-black">
              {correctPodiumPicks}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Wildcards
            </p>

            <p className="mt-2 text-xl font-black">
              {wildcardHits}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Perfect Rounds
            </p>

            <p className="mt-2 text-xl font-black">
              {perfectRounds}
            </p>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 bg-black/30 px-6 py-5">
            <h2 className="text-xl font-black uppercase">
              Round History
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Points earned at each completed round.
            </p>
          </div>

          {scores.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-xl font-bold">
                No completed rounds yet
              </h3>

              <p className="mt-2 text-sm text-neutral-400">
                This player’s history will appear once scores are
                calculated.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {scores.map((score) => {
                const event = getEvent(score);

                return (
                  <article
                    key={score.event_id}
                    className="grid gap-5 px-6 py-5 transition hover:bg-neutral-800/40 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-orange-500">
                        {event?.series ?? "RacePicks"} · Round{" "}
                        {event?.round_number ?? "—"}
                      </p>

                      <h3 className="mt-2 text-lg font-black">
                        {event?.venue ?? "Unknown event"}
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <span
                          className={`rounded-full px-3 py-1 ${
                            score.first_points > 0
                              ? "bg-green-950 text-green-400"
                              : "bg-neutral-800 text-neutral-500"
                          }`}
                        >
                          1st +{score.first_points}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 ${
                            score.second_points > 0
                              ? "bg-green-950 text-green-400"
                              : "bg-neutral-800 text-neutral-500"
                          }`}
                        >
                          2nd +{score.second_points}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 ${
                            score.third_points > 0
                              ? "bg-green-950 text-green-400"
                              : "bg-neutral-800 text-neutral-500"
                          }`}
                        >
                          3rd +{score.third_points}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 ${
                            score.wildcard_points > 0
                              ? "bg-green-950 text-green-400"
                              : "bg-neutral-800 text-neutral-500"
                          }`}
                        >
                          Wildcard +{score.wildcard_points}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-3xl font-black text-orange-500">
                        {score.round_points}
                      </p>

                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                        Points
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}