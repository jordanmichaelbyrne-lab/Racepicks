import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";

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
  round_number: number;
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
  size = "normal",
}: {
  player: LeaderboardPlayer;
  size?: "normal" | "large";
}) {
  const sizeClass =
    size === "large" ? "h-20 w-20 text-2xl" : "h-14 w-14 text-lg";

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
  const topThree = leaderboard.slice(0, 3);
  const remainingPlayers = leaderboard.slice(3);
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
      .select("id, venue, series, round_number")
      .eq("status", "completed")
      .order("race_date", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestEventError) {
    console.error("Latest completed event error:", latestEventError);
  }

  const latestEvent = latestEventData as LatestEvent | null;

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

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-block text-sm font-bold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to Race Centre
        </Link>

        <header className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            2027 RacePicks
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
                  {roundWinner.series} · Round {roundWinner.round_number} ·{" "}
                  {roundWinner.venue}
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

        {leaderboard.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-10 text-center">
            <h2 className="text-xl font-bold">No players yet</h2>

            <p className="mt-2 text-sm text-neutral-400">
              Players will appear here once their accounts are created.
            </p>
          </div>
        ) : (
          <>
            <section className="mt-10">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Championship Podium
                </p>

                <h2 className="mt-2 text-2xl font-black uppercase">
                  Top Three
                </h2>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3 sm:items-end">
                {topThree[1] && (
                  <Link
                    href={`/leaderboard/${topThree[1].user_id}`}
                    className={`group order-2 rounded-3xl border p-6 transition hover:-translate-y-1 hover:border-neutral-500 sm:order-1 ${
                      user?.id === topThree[1].user_id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-neutral-700 bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-5xl">🥈</span>

                      {user?.id === topThree[1].user_id && (
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase text-black">
                          You
                        </span>
                      )}
                    </div>

                    <div className="mt-6">
                      <PlayerAvatar
                        player={topThree[1]}
                        size="normal"
                      />

                      <h3 className="mt-4 text-xl font-black uppercase transition group-hover:text-orange-500">
                        {topThree[1].display_name}
                      </h3>

                      <p className="mt-2 text-3xl font-black">
                        {topThree[1].total_points}
                        <span className="ml-1 text-sm text-neutral-500">
                          pts
                        </span>
                      </p>

                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                        {getPointsBehindLeader(topThree[1], leader)}
                      </p>
                    </div>
                  </Link>
                )}

                {topThree[0] && (
                  <Link
                    href={`/leaderboard/${topThree[0].user_id}`}
                    className={`group order-1 rounded-3xl border p-7 transition hover:-translate-y-1 sm:order-2 ${
                      user?.id === topThree[0].user_id
                        ? "border-orange-300 bg-orange-500/20"
                        : "border-orange-500 bg-orange-500/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-6xl">🥇</span>

                      <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase text-black">
                        Leader
                      </span>
                    </div>

                    <div className="mt-6">
                      <PlayerAvatar
                        player={topThree[0]}
                        size="large"
                      />

                      <h3 className="mt-4 text-2xl font-black uppercase transition group-hover:text-orange-300">
                        {topThree[0].display_name}
                      </h3>

                      <p className="mt-2 text-4xl font-black text-orange-500">
                        {topThree[0].total_points}
                        <span className="ml-1 text-sm text-neutral-400">
                          pts
                        </span>
                      </p>

                      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-orange-300">
                        Championship Leader
                      </p>
                    </div>
                  </Link>
                )}

                {topThree[2] && (
                  <Link
                    href={`/leaderboard/${topThree[2].user_id}`}
                    className={`group order-3 rounded-3xl border p-6 transition hover:-translate-y-1 hover:border-amber-700 ${
                      user?.id === topThree[2].user_id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-neutral-700 bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-5xl">🥉</span>

                      {user?.id === topThree[2].user_id && (
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase text-black">
                          You
                        </span>
                      )}
                    </div>

                    <div className="mt-6">
                      <PlayerAvatar
                        player={topThree[2]}
                        size="normal"
                      />

                      <h3 className="mt-4 text-xl font-black uppercase transition group-hover:text-orange-500">
                        {topThree[2].display_name}
                      </h3>

                      <p className="mt-2 text-3xl font-black">
                        {topThree[2].total_points}
                        <span className="ml-1 text-sm text-neutral-500">
                          pts
                        </span>
                      </p>

                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                        {getPointsBehindLeader(topThree[2], leader)}
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            </section>

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
                <div className="hidden grid-cols-[80px_1fr_120px_140px_120px] border-b border-neutral-800 bg-black/30 px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-500 md:grid">
                  <div>Pos</div>
                  <div>Player</div>
                  <div className="text-center">Rounds</div>
                  <div className="text-center">Behind</div>
                  <div className="text-right">Points</div>
                </div>

                <div className="divide-y divide-neutral-800">
                  {remainingPlayers.map((player, index) => {
                    const position = index + 4;
                    const isCurrentUser = user?.id === player.user_id;

                    return (
                      <Link
                        key={player.user_id}
                        href={`/leaderboard/${player.user_id}`}
                        className={`grid gap-4 px-5 py-5 transition hover:bg-neutral-800/50 md:grid-cols-[80px_1fr_120px_140px_120px] md:items-center md:px-6 ${
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
                          {player.rounds_scored > 0 ? player.rounds_scored : "–"}
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
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}