import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "@/app/components/Navbar";

const SEASON = 2027;

type TeamScoreRow = {
  team_id: string;
  total_points: number;
};

export default async function ProLeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: teams, error: teamsError } = await supabase
    .from("pro_teams")
    .select("id, user_id, team_name, manufacturer")
    .eq("season", SEASON);

  if (teamsError) {
    throw new Error(teamsError.message);
  }

  if (!teams || teams.length === 0) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Navbar />
        </div>
        <div className="mx-auto max-w-3xl">
          <header className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
              Racepicks Pro · {SEASON}
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
              Pro Leaderboard
            </h1>
          </header>
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-10 text-center">
            <p className="text-neutral-400">No teams have been built yet.</p>
          </div>
        </div>
      </main>
    );
  }

  const teamIds = teams.map((t) => t.id);

  const { data: scoreRows, error: scoresError } = await supabase
    .from("pro_team_round_scores")
    .select("team_id, total_points")
    .in("team_id", teamIds);

  if (scoresError) {
    throw new Error(scoresError.message);
  }

  const totalByTeamId = new Map<string, number>();
  const roundsByTeamId = new Map<string, number>();

  for (const row of (scoreRows ?? []) as TeamScoreRow[]) {
    totalByTeamId.set(row.team_id, (totalByTeamId.get(row.team_id) ?? 0) + row.total_points);
    roundsByTeamId.set(row.team_id, (roundsByTeamId.get(row.team_id) ?? 0) + 1);
  }

  const userIds = Array.from(new Set(teams.map((t) => t.user_id)));

  // These are OTHER managers' profiles, not necessarily the current
  // user's own row — must read from the public-safe view, since RLS
  // now restricts direct profiles reads to the caller's own row.
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileByUserId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const standings = teams
    .map((team) => {
      const profile = profileByUserId.get(team.user_id);
      return {
        teamId: team.id,
        teamName: team.team_name || profile?.display_name || "Unnamed Team",
        managerName: profile?.display_name ?? "Unknown",
        manufacturer: team.manufacturer,
        totalPoints: totalByTeamId.get(team.id) ?? 0,
        roundsScored: roundsByTeamId.get(team.id) ?? 0,
        isYou: team.user_id === user.id,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const yourTeam = standings.find((s) => s.isYou);
  const yourPosition = yourTeam ? standings.indexOf(yourTeam) + 1 : null;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Navbar />
      </div>

      <div className="mx-auto max-w-3xl">
        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Racepicks Pro · {SEASON}
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
            Pro Leaderboard
          </h1>
        </header>

        {yourTeam && yourPosition && (
          <div className="sticky top-4 z-20 mt-6 rounded-2xl border border-orange-500 bg-black/95 p-5 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                  {yourPosition}
                </div>
                <div>
                  <p className="font-black">{yourTeam.teamName}</p>
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                    You
                  </span>
                </div>
              </div>
              <span className="text-2xl font-black text-orange-500">
                {yourTeam.totalPoints} pts
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
          <div className="hidden grid-cols-[50px_1fr_140px_90px_90px] gap-3 border-b border-neutral-800 bg-black/40 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-neutral-500 md:grid">
            <div>Pos</div>
            <div>Team</div>
            <div>Manufacturer</div>
            <div className="text-right">Rounds</div>
            <div className="text-right">Points</div>
          </div>

          <div className="divide-y divide-neutral-800">
            {standings.map((team, index) => (
              <div
                key={team.teamId}
                className={`grid grid-cols-[40px_1fr_80px] items-center gap-3 px-6 py-4 md:grid-cols-[50px_1fr_140px_90px_90px] ${
                  team.isYou ? "bg-orange-500/10" : ""
                }`}
              >
                <div className="font-black text-neutral-400">{index + 1}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-black">{team.teamName}</p>
                    {team.isYou && (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                        You
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-neutral-500">{team.managerName}</p>
                </div>
                <div className="hidden text-sm text-neutral-400 md:block">
                  {team.manufacturer ?? "—"}
                </div>
                <div className="hidden text-right text-sm text-neutral-500 md:block">
                  {team.roundsScored}
                </div>
                <div className="text-right font-black text-orange-500">
                  {team.totalPoints}
                  <span className="ml-1 text-[10px] font-bold uppercase text-neutral-600 md:hidden">
                    pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pro"
            className="inline-flex items-center gap-2 font-black text-zinc-400 transition hover:text-orange-500"
          >
            <span>←</span>
            <span>Back to Racepicks Pro</span>
          </Link>
        </div>
      </div>
    </main>
  );
}