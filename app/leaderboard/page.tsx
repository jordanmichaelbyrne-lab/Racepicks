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

export default async function LeaderboardPage() {
  const supabase = await createClient();

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
    console.error("Leaderboard error:", error);

    return (
      <main className="min-h-screen bg-neutral-950 px-4 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-4xl font-black uppercase">Leaderboard</h1>

          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/40 p-6">
            <p className="font-semibold text-red-300">
              The leaderboard could not be loaded.
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

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
            2027 Championship
          </p>

          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">
            World Leaderboard
          </h1>

          <p className="mt-3 text-sm text-neutral-400">
            Overall standings across all completed rounds.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Current Leader
            </p>

            <p className="mt-2 text-xl font-bold">
              {leader?.display_name ?? "No leader yet"}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Leading Score
            </p>

            <p className="mt-2 text-xl font-bold text-orange-500">
              {leader ? `${leader.total_points} pts` : "0 pts"}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Players
            </p>

            <p className="mt-2 text-xl font-bold">{leaderboard.length}</p>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <h2 className="text-xl font-bold">No players yet</h2>

            <p className="mt-2 text-sm text-neutral-400">
              Player profiles will appear here after users sign up.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="border-b border-neutral-800 bg-black/40">
                  <tr className="text-left text-xs uppercase tracking-widest text-neutral-500">
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4 text-center">Rounds</th>
                    <th className="px-6 py-4 text-center">Best Round</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {leaderboard.map((player, index) => {
                    const position = index + 1;

                    return (
                      <tr
                        key={player.user_id}
                        className="border-b border-neutral-800/80 transition hover:bg-neutral-800/50 last:border-b-0"
                      >
                        <td className="px-6 py-5">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${getPositionStyle(
                              position
                            )}`}
                          >
                            {position}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <Link
                            href={`/leaderboard/${player.user_id}`}
                            className="group inline-block"
                          >
                            <p className="font-bold transition group-hover:text-orange-500">
                              {player.display_name}
                            </p>

                            <p className="mt-1 text-xs text-neutral-500 transition group-hover:text-neutral-300">
                              View points history →
                            </p>
                          </Link>
                        </td>

                        <td className="px-6 py-5 text-center font-semibold">
                          {player.rounds_scored}
                        </td>

                        <td className="px-6 py-5 text-center text-neutral-300">
                          {player.best_round} pts
                        </td>

                        <td className="px-6 py-5 text-right text-xl font-black text-orange-500">
                          {player.total_points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}