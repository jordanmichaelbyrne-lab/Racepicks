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

type AllScoreRow = {
  user_id: string;
  event_id: string;
  round_points: number;
};

type CurrentEvent = {
  id: string;
  round_number: number;
  venue: string;
  series: string;
  season: number;
  race_date: string;
  picks_close_at: string;
  wildcard_position: number | null;
  status: string;
};

type CurrentPick = {
  first_rider_id: string;
  second_rider_id: string;
  third_rider_id: string;
  wildcard_rider_id: string;
  updated_at: string;
};

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  manufacturer: string | null;
  team_name: string | null;
};

type PickPosition = {
  label: string;
  rider: Rider | null;
  symbol: string;
  wildcard?: boolean;
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

  const lastTwoDigits = position % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${position}th`;
  }

  const lastDigit = position % 10;

  if (lastDigit === 1) return `${position}st`;
  if (lastDigit === 2) return `${position}nd`;
  if (lastDigit === 3) return `${position}rd`;

  return `${position}th`;
}

function getRecentFormStyle(points: number) {
  if (points >= 70) {
    return "border-green-500/40 bg-green-500/10 text-green-300";
  }

  if (points >= 40) {
    return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  }

  return "border-neutral-700 bg-neutral-800 text-neutral-300";
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
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
    { data: allScoreData, error: allScoresError },
    { data: currentEventData, error: currentEventError },
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

    supabase
      .from("scores")
      .select("user_id, event_id, round_points"),

    supabase
      .from("events")
      .select(
        `
          id,
          round_number,
          venue,
          series,
          season,
          race_date,
          picks_close_at,
          wildcard_position,
          status
        `
      )
      .in("status", ["open", "upcoming"])
      .order("race_date", { ascending: true }),
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

  if (allScoresError) {
    console.error("Round winner loading error:", allScoresError);
  }

  if (currentEventError) {
    console.error("Current event loading error:", currentEventError);
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

  const allScores = (allScoreData ?? []) as AllScoreRow[];

  const availableEvents =
    (currentEventData ?? []) as CurrentEvent[];

  const currentEvent =
    availableEvents.find((event) => event.status === "open") ??
    availableEvents[0] ??
    null;

  let currentPick: CurrentPick | null = null;
  let selectedRiders: Rider[] = [];

  if (currentEvent) {
    const { data: currentPickData, error: currentPickError } =
      await supabase
        .from("picks")
        .select(
          `
            first_rider_id,
            second_rider_id,
            third_rider_id,
            wildcard_rider_id,
            updated_at
          `
        )
        .eq("user_id", userId)
        .eq("event_id", currentEvent.id)
        .maybeSingle();

    if (currentPickError) {
      console.error("Current player picks error:", currentPickError);
    }

    currentPick = currentPickData as CurrentPick | null;

    const selectedRiderIds = currentPick
      ? Array.from(
          new Set([
            currentPick.first_rider_id,
            currentPick.second_rider_id,
            currentPick.third_rider_id,
            currentPick.wildcard_rider_id,
          ])
        )
      : [];

    if (selectedRiderIds.length > 0) {
      const { data: riderData, error: riderError } =
        await supabase
          .from("riders")
          .select(
            `
              id,
              full_name,
              race_number,
              manufacturer,
              team_name
            `
          )
          .in("id", selectedRiderIds);

      if (riderError) {
        console.error("Current pick riders error:", riderError);
      }

      selectedRiders = (riderData ?? []) as Rider[];
    }
  }

  function findRider(riderId?: string) {
    if (!riderId) {
      return null;
    }

    return (
      selectedRiders.find((rider) => rider.id === riderId) ?? null
    );
  }

  const displayedPicks: PickPosition[] = currentPick
    ? [
        {
          label: "1st Place",
          rider: findRider(currentPick.first_rider_id),
          symbol: "🥇",
        },
        {
          label: "2nd Place",
          rider: findRider(currentPick.second_rider_id),
          symbol: "🥈",
        },
        {
          label: "3rd Place",
          rider: findRider(currentPick.third_rider_id),
          symbol: "🥉",
        },
        {
          label: currentEvent?.wildcard_position
            ? `Wildcard — ${getPositionLabel(
                currentEvent.wildcard_position
              )}`
            : "Wildcard",
          rider: findRider(currentPick.wildcard_rider_id),
          symbol: "⭐",
          wildcard: true,
        },
      ]
    : [];

  const playerSummary = leaderboardRows.find(
    (row) => row.user_id === userId
  );

  const playerIndex = leaderboardRows.findIndex(
    (row) => row.user_id === userId
  );

  const playerPosition = playerIndex >= 0 ? playerIndex + 1 : 0;

  const totalPoints =
    playerSummary?.total_points ??
    scores.reduce(
      (total, score) => total + score.round_points,
      0
    );

  const roundsScored =
    playerSummary?.rounds_scored ?? scores.length;

  const bestRound =
    playerSummary?.best_round ??
    Math.max(0, ...scores.map((score) => score.round_points));

  const firstHits = scores.filter(
    (score) => score.first_points > 0
  ).length;

  const secondHits = scores.filter(
    (score) => score.second_points > 0
  ).length;

  const thirdHits = scores.filter(
    (score) => score.third_points > 0
  ).length;

  const wildcardHits = scores.filter(
    (score) => score.wildcard_points > 0
  ).length;

  const perfectRounds = scores.filter(
    (score) =>
      score.first_points === 25 &&
      score.second_points === 22 &&
      score.third_points === 20 &&
      score.wildcard_points === 25
  ).length;

  const highestScoreByEvent = new Map<string, number>();

  for (const score of allScores) {
    const currentHighest =
      highestScoreByEvent.get(score.event_id) ?? 0;

    if (score.round_points > currentHighest) {
      highestScoreByEvent.set(
        score.event_id,
        score.round_points
      );
    }
  }

  const roundWins = scores.filter((score) => {
    const highestScore =
      highestScoreByEvent.get(score.event_id) ?? 0;

    return (
      score.round_points > 0 &&
      score.round_points === highestScore
    );
  }).length;

  const recentForm = [...scores].reverse().slice(0, 5);

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
                  Racepicks championship history
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

        <section
          id="next-round-picks"
          className="scroll-mt-6 mt-8 overflow-hidden rounded-3xl border border-orange-500/40 bg-neutral-900"
        >
          <div className="border-b border-neutral-800 bg-orange-500/10 px-6 py-5 sm:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Current Round
                </p>

                <h2 className="mt-2 text-2xl font-black uppercase">
                  Next Round Picks
                </h2>

                {currentEvent && (
                  <p className="mt-2 text-sm text-neutral-400">
                    {currentEvent.season} {currentEvent.series} ·
                    Round {currentEvent.round_number} ·{" "}
                    {currentEvent.venue}
                  </p>
                )}
              </div>

              {currentPick && (
                <span className="w-fit rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-green-400">
                  Picks Submitted
                </span>
              )}
            </div>
          </div>

          {!currentEvent ? (
            <div className="p-8 text-center">
              <h3 className="text-xl font-bold">
                No current round
              </h3>

              <p className="mt-2 text-sm text-neutral-400">
                The next event will appear here when it becomes
                available.
              </p>
            </div>
          ) : !currentPick ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800 text-2xl">
                👁
              </div>

              <h3 className="mt-4 text-xl font-bold">
                No picks submitted yet
              </h3>

              <p className="mt-2 text-sm text-neutral-400">
                {player.display_name} has not entered picks for{" "}
                {currentEvent.venue}.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-px bg-neutral-800 sm:grid-cols-2">
                {displayedPicks.map((pick) => (
                  <div
                    key={pick.label}
                    className="bg-neutral-900 p-5 sm:p-6"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${
                          pick.wildcard
                            ? "bg-orange-500 text-black"
                            : "bg-neutral-800"
                        }`}
                      >
                        {pick.symbol}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                          {pick.label}
                        </p>

                        <p className="mt-1 truncate text-lg font-black">
                          {pick.rider?.full_name ??
                            "Unknown rider"}
                        </p>

                        <p className="mt-1 truncate text-sm text-neutral-500">
                          {pick.rider?.race_number
                            ? `#${pick.rider.race_number}`
                            : "No race number"}

                          {pick.rider?.manufacturer
                            ? ` · ${pick.rider.manufacturer}`
                            : ""}

                          {pick.rider?.team_name
                            ? ` · ${pick.rider.team_name}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-800 px-6 py-4">
                <p className="text-xs text-neutral-500">
                  Last updated{" "}
                  {formatDateTime(currentPick.updated_at)} · Picks
                  remain visible to all Racepicks players.
                </p>
              </div>
            </>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Round Wins
            </p>

            <p className="mt-2 text-xl font-black">
              {roundWins}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              🥇 First Picks
            </p>

            <p className="mt-2 text-xl font-black">
              {firstHits}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              🥈 Second Picks
            </p>

            <p className="mt-2 text-xl font-black">
              {secondHits}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              🥉 Third Picks
            </p>

            <p className="mt-2 text-xl font-black">
              {thirdHits}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              ⭐ Wildcards
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

        <section className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Recent Form
          </p>

          <h2 className="mt-2 text-xl font-black uppercase">
            Last Five Rounds
          </h2>

          {recentForm.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">
              Recent form will appear after scores are calculated.
            </p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              {recentForm.map((score) => {
                const event = getEvent(score);

                return (
                  <div
                    key={score.event_id}
                    title={`${event?.venue ?? "Race"} · ${
                      score.round_points
                    } points`}
                    className={`flex h-16 min-w-16 items-center justify-center rounded-2xl border px-4 text-xl font-black ${getRecentFormStyle(
                      score.round_points
                    )}`}
                  >
                    {score.round_points}
                  </div>
                );
              })}
            </div>
          )}
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
                        {event?.series ?? "Racepicks"} · Round{" "}
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