import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "@/app/components/Navbar";

type LeaderboardPlayer = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rounds_scored: number;
  total_points: number;
  best_round: number;
};

type LatestEvent = {
  id: string;
  venue: string;
  series: string;
  season: number;
  round_number: number;
};

type CurrentEvent = {
  id: string;
  venue: string;
  series: string;
  season: number;
  round_number: number;
  status: string;
};

type RoundScore = {
  user_id: string;
  round_points: number;
};

type RoundWinner = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  round_points: number;
  venue: string;
  series: string;
  round_number: number;
};

type SubmittedPick = {
  user_id: string;
};

function getPositionStyle(position: number) {
  if (position === 1) {
    return "bg-orange-500 text-black";
  }

  if (position === 2) {
    return "bg-neutral-300 text-black";
  }

  if (position === 3) {
    return "bg-amber-700 text-white";
  }

  return "bg-neutral-800 text-neutral-300";
}

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getPointsBehindLeader(
  player: LeaderboardPlayer,
  leader: LeaderboardPlayer | undefined
) {
  if (!leader || player.user_id === leader.user_id) {
    return "Leader";
  }

  return `-${leader.total_points - player.total_points} pts`;
}

function PlayerAvatar({
  player,
}: {
  player: LeaderboardPlayer;
}) {
  const sizeClass = "h-14 w-14 text-lg";

  if (player.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.avatar_url}
        alt={player.display_name}
        className={`${sizeClass} rounded-2xl object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-2xl bg-orange-500 font-black text-black`}
    >
      {getInitials(player.display_name) || "RP"}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M2.5 12C4.8 7.7 8.1 5.5 12 5.5S19.2 7.7 21.5 12C19.2 16.3 15.9 18.5 12 18.5S4.8 16.3 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("leaderboard")
    .select(
      `
        user_id,
        display_name,
        avatar_url,
        rounds_scored,
        total_points,
        best_round
      `
    )
    .order("total_points", { ascending: false })
    .order("display_name", { ascending: true });

  if (error) {
    console.error("Championship loading error:", error);

    return (
      <main className="min-h-screen bg-neutral-950 px-4 py-12 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-block text-sm font-bold text-neutral-400 transition hover:text-orange-500"
          >
            ← Back to Race Centre
          </Link>

          <h1 className="mt-8 text-4xl font-black uppercase">
            Championship
          </h1>

          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/40 p-6">
            <p className="font-semibold text-red-300">
              The championship could not be loaded.
            </p>

            <p className="mt-2 text-sm text-red-400">
              Check the server terminal for the Supabase error.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const leaderboard = (data ?? []) as LeaderboardPlayer[];
  const leader = leaderboard[0];
  const standings = leaderboard;

  const { count: completedRounds, error: completedRoundsError } =
    await supabase
      .from("events")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "completed");

  if (completedRoundsError) {
    console.error(
      "Completed rounds loading error:",
      completedRoundsError
    );
  }

  let roundWinner: RoundWinner | null = null;

  const { data: latestEventData, error: latestEventError } =
    await supabase
      .from("events")
      .select("id, venue, series, season, round_number")
      .eq("status", "completed")
      .order("race_date", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestEventError) {
    console.error("Latest completed event error:", latestEventError);
  }

  const latestEvent = latestEventData as LatestEvent | null;

  const championshipSeason =
    latestEvent?.season ?? new Date().getFullYear();

  if (latestEvent) {
    const { data: roundScoreData, error: roundScoreError } =
      await supabase
        .from("scores")
        .select("user_id, round_points")
        .eq("event_id", latestEvent.id)
        .order("round_points", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (roundScoreError) {
      console.error("Round winner score error:", roundScoreError);
    }

    const winningScore = roundScoreData as RoundScore | null;

    if (winningScore) {
      const winnerProfile = leaderboard.find(
        (player) => player.user_id === winningScore.user_id
      );

      if (winnerProfile) {
        roundWinner = {
          user_id: winnerProfile.user_id,
          display_name: winnerProfile.display_name,
          avatar_url: winnerProfile.avatar_url,
          round_points: winningScore.round_points,
          venue: latestEvent.venue,
          series: latestEvent.series,
          round_number: latestEvent.round_number,
        };
      }
    }
  }

  const { data: currentEventData, error: currentEventError } =
    await supabase
      .from("events")
      .select(
        `
          id,
          venue,
          series,
          season,
          round_number,
          status
        `
      )
      .in("status", ["open", "upcoming"])
      .order("race_date", { ascending: true });

  if (currentEventError) {
    console.error("Current event loading error:", currentEventError);
  }

  const availableEvents =
    (currentEventData ?? []) as CurrentEvent[];

  const currentEvent =
    availableEvents.find((event) => event.status === "open") ??
    availableEvents[0] ??
    null;

  let submittedPickUserIds = new Set<string>();

  if (currentEvent) {
    const { data: submittedPickData, error: submittedPicksError } =
      await supabase
        .from("picks")
        .select("user_id")
        .eq("event_id", currentEvent.id);

    if (submittedPicksError) {
      console.error(
        "Submitted player picks loading error:",
        submittedPicksError
      );
    }

    submittedPickUserIds = new Set(
      ((submittedPickData ?? []) as SubmittedPick[]).map(
        (pick) => pick.user_id
      )
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-12 sm:py-16">
          <Link
            href="/"
            className="inline-block text-sm font-bold text-neutral-400 transition hover:text-orange-500"
          >
            ← Back to Race Centre
          </Link>

          <header className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
              {championshipSeason} Racepicks
            </p>

            <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
              Championship
            </h1>

            <p className="mt-3 text-sm text-neutral-400">
              Overall standings across all completed rounds.
            </p>
          </header>

          {roundWinner && (
            <section className="mt-8 overflow-hidden rounded-3xl border border-orange-500/40 bg-orange-500/10">
              <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-3xl">
                  🏁
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
                    Latest Round Winner
                  </p>

                  <Link
                    href={`/leaderboard/${roundWinner.user_id}`}
                    className="mt-2 inline-block text-2xl font-black uppercase transition hover:text-orange-400"
                  >
                    {roundWinner.display_name}
                  </Link>

                  <p className="mt-1 text-sm text-neutral-400">
                    {roundWinner.series} · Round{" "}
                    {roundWinner.round_number} · {roundWinner.venue}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-4xl font-black text-orange-500">
                    {roundWinner.round_points}
                  </p>

                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Round Points
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Championship Leader
              </p>

              <p className="mt-2 text-xl font-black">
                {leader?.display_name ?? "No leader yet"}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Leading Score
              </p>

              <p className="mt-2 text-xl font-black text-orange-500">
                {leader ? `${leader.total_points} pts` : "0 pts"}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Rounds Completed
              </p>

              <p className="mt-2 text-xl font-black">
                {completedRounds ?? 0}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                {latestEvent
                  ? `Latest: ${latestEvent.venue}`
                  : "No completed rounds yet"}
              </p>
            </div>
          </section>

          {currentEvent && (
            <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-orange-500">
                    Current Round Picks
                  </p>

                  <p className="mt-1 font-bold">
                    {currentEvent.series} · Round{" "}
                    {currentEvent.round_number} · {currentEvent.venue}
                  </p>
                </div>

                <p className="text-sm text-neutral-400">
                  Press the eye beside a player to view their picks.
                </p>
              </div>
            </section>
          )}

          {leaderboard.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-10 text-center">
              <h2 className="text-xl font-bold">No players yet</h2>

              <p className="mt-2 text-sm text-neutral-400">
                Players will appear here once their accounts are
                created.
              </p>
            </div>
          ) : (
            <section className="mt-10">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Full Field
                </p>

                <h2 className="mt-2 text-2xl font-black uppercase">
                  Championship Standings
                </h2>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
                <div className="hidden grid-cols-[80px_1fr_120px_140px_120px_140px] border-b border-neutral-800 bg-black/30 px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-500 md:grid">
                  <div>Pos</div>
                  <div>Player</div>
                  <div className="text-center">Rounds</div>
                  <div className="text-center">Behind</div>
                  <div className="text-right">Points</div>
                  <div className="text-right">Picks</div>
                </div>

                <div className="divide-y divide-neutral-800">
                  {standings.map((player, index) => {
                    const position = index + 1;
                    const isCurrentUser =
                      user?.id === player.user_id;

                    const hasCurrentPicks =
                      currentEvent &&
                      submittedPickUserIds.has(player.user_id);

                    return (
                      <div
                        key={player.user_id}
                        className={`grid gap-4 px-5 py-5 md:grid-cols-[80px_1fr_120px_140px_120px_140px] md:items-center md:px-6 ${
                          isCurrentUser
                            ? "border-l-4 border-orange-500 bg-orange-500/10"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between md:block">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${getPositionStyle(
                              position
                            )}`}
                          >
                            {position}
                          </div>

                          <span className="text-xs font-bold uppercase text-neutral-500 md:hidden">
                            {getPointsBehindLeader(player, leader)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <PlayerAvatar player={player} />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-black">
                                {player.display_name}
                              </p>

                              {isCurrentUser && (
                                <span className="rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black uppercase text-black">
                                  You
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-neutral-500">
                              Best round: {player.best_round} pts
                            </p>
                          </div>
                        </div>

                        <div className="hidden text-center font-bold md:block">
                          {player.rounds_scored > 0
                            ? player.rounds_scored
                            : "–"}
                        </div>

                        <div className="hidden text-center text-sm font-bold text-neutral-400 md:block">
                          {getPointsBehindLeader(player, leader)}
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-2xl font-black text-orange-500">
                            {player.total_points}
                          </span>

                          <span className="ml-1 text-xs font-bold uppercase text-neutral-500">
                            pts
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 md:justify-end">
                          <span className="text-xs font-bold uppercase text-neutral-500 md:hidden">
                            Current Picks
                          </span>

                          {hasCurrentPicks ? (
                            <Link
                              href={`/leaderboard/${player.user_id}#next-round-picks`}
                              aria-label={`View ${player.display_name}'s current picks`}
                              title={`View ${player.display_name}'s current picks`}
                              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 font-black text-orange-400 transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
                            >
                              <EyeIcon />

                              <span className="hidden lg:inline">
                                View Picks
                              </span>
                            </Link>
                          ) : (
                            <span className="flex h-11 items-center justify-center rounded-xl border border-neutral-800 bg-black/20 px-4 text-xs font-bold uppercase text-neutral-600">
                              No Picks
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}