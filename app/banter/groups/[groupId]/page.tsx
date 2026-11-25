import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/app/lib/supabase/server";
import { pickFocusSeason } from "@/app/lib/current-season";
import { getSeasonStandings } from "@/app/lib/season-standings";
import GroupChatBoard from "./GroupChatBoard";
import GroupSettings from "./GroupSettings";

type PageProps = {
  params: Promise<{
    groupId: string;
  }>;
  searchParams: Promise<{
    season?: string;
  }>;
};

type GroupLeaderboardRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  rounds_scored: number;
};

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getMedalStyle(position: number) {
  if (position === 1) return "bg-orange-500 text-black";
  if (position === 2) return "bg-zinc-300 text-black";
  if (position === 3) return "bg-amber-700 text-white";
  return "bg-zinc-800 text-zinc-400";
}

export default async function GroupChatPage({
  params,
  searchParams,
}: PageProps) {
  const { groupId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Confirm the current user is actually a member of this group.
  const { data: membership, error: membershipError } = await supabase
    .from("chat_group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    notFound();
  }

  const { data: group, error: groupError } = await supabase
    .from("chat_groups")
    .select("id, name, created_by")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const { data: rawMembers, error: membersError } = await supabase
    .from("chat_group_members")
    .select("user_id, role")
    .eq("group_id", groupId);

  if (membersError) {
    throw new Error(membersError.message);
  }

  const memberUserIds = (rawMembers ?? []).map((member) => member.user_id);

  let memberProfilesById = new Map<
    string,
    { display_name: string | null; avatar_url: string | null }
  >();

  if (memberUserIds.length > 0) {
    // Other members' names — must read from the public-safe view, not
    // the base profiles table, since RLS restricts direct profiles
    // reads to the caller's own row.
    const { data: memberProfiles, error: memberProfilesError } =
      await supabase
        .from("public_profiles")
        .select("id, display_name, avatar_url")
        .in("id", memberUserIds);

    if (memberProfilesError) {
      throw new Error(memberProfilesError.message);
    }

    memberProfilesById = new Map(
      (memberProfiles ?? []).map((profile) => [
        profile.id,
        {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        },
      ])
    );
  }

  const memberRows = (rawMembers ?? []).map((member) => ({
    user_id: member.user_id,
    role: member.role,
    profiles: memberProfilesById.get(member.user_id) ?? null,
  }));

  // Group leaderboard — this season's real standings (the same
  // season-scoped points as the main /leaderboard), filtered down to
  // this group's members. Points are per SEASON, so a new season
  // starts everyone at zero; earlier seasons stay one click away via
  // the season switcher.
  const { data: seasonEventData, error: seasonEventsError } = await supabase
    .from("events")
    .select("season, status, race_date");

  if (seasonEventsError) {
    console.error("Group leaderboard: error loading events:", seasonEventsError);
  }

  const seasonEvents = (seasonEventData ?? []) as {
    season: number;
    status: string;
    race_date: string;
  }[];

  const focusSeason =
    pickFocusSeason(seasonEvents) ?? new Date().getFullYear();

  const seasonsWithActivity = Array.from(
    new Set(
      seasonEvents
        .filter(
          (event) =>
            event.season === focusSeason || event.status !== "upcoming"
        )
        .map((event) => event.season)
    )
  ).sort((first, second) => second - first);

  const requestedSeason = Number.parseInt(query.season ?? "", 10);

  const viewSeason = seasonsWithActivity.includes(requestedSeason)
    ? requestedSeason
    : focusSeason;

  const seasonStandings = await getSeasonStandings(supabase, viewSeason);
  const standingsByUserId = new Map(
    seasonStandings.map((row) => [row.user_id, row])
  );

  // Every member is listed, including anyone with no scored round yet
  // this season (they show at 0) — it's a friends' mini-competition,
  // so nobody should vanish from it.
  const groupLeaderboard: GroupLeaderboardRow[] = memberUserIds
    .map((memberId) => {
      const standing = standingsByUserId.get(memberId);
      const profile = memberProfilesById.get(memberId);

      return {
        user_id: memberId,
        display_name:
          standing?.display_name ??
          profile?.display_name?.trim() ??
          "MX Gatepicks Player",
        avatar_url: standing?.avatar_url ?? profile?.avatar_url ?? null,
        total_points: standing?.total_points ?? 0,
        rounds_scored: standing?.rounds_scored ?? 0,
      };
    })
    .sort(
      (first, second) =>
        second.total_points - first.total_points ||
        first.display_name.localeCompare(second.display_name)
    );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="mx-auto max-w-4xl py-10 sm:py-14">
          <Link
            href="/banter"
            className="text-sm font-bold text-zinc-500 transition hover:text-orange-500"
          >
            ← Back to Banter
          </Link>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Private Group
          </p>

          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-6xl">
            {group.name}
          </h1>

          <GroupSettings
            groupId={group.id}
            groupName={group.name}
            currentUserId={user.id}
            isOwner={group.created_by === user.id}
            members={memberRows.map((member) => ({
              user_id: member.user_id,
              role: member.role,
              display_name:
                member.profiles?.display_name?.trim() || "MX Gatepicks Player",
            }))}
          />

          {groupLeaderboard.length > 0 && (
            <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-6 py-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Group Leaderboard · {viewSeason} Season
                </p>

                {seasonsWithActivity.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {seasonsWithActivity.map((season) => (
                      <Link
                        key={season}
                        href={`/banter/groups/${group.id}?season=${season}`}
                        aria-current={season === viewSeason ? "page" : undefined}
                        className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide transition ${
                          season === viewSeason
                            ? "border-orange-500 bg-orange-500 text-black"
                            : "border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-400"
                        }`}
                      >
                        {season}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="divide-y divide-zinc-800">
                {groupLeaderboard.map((player, index) => {
                  const position = index + 1;
                  const isYou = player.user_id === user.id;
                  const displayName =
                    player.display_name?.trim() || "MX Gatepicks Player";

                  return (
                    <div
                      key={player.user_id}
                      className={`flex items-center gap-4 px-6 py-4 ${
                        isYou ? "bg-orange-500/10" : ""
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${getMedalStyle(
                          position
                        )}`}
                      >
                        {position}
                      </span>

                      {player.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.avatar_url}
                          alt={displayName}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-black text-[11px] font-black text-zinc-400">
                          {getInitials(displayName) || "RP"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-black">
                            {displayName}
                          </p>

                          {isYou && (
                            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                              You
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-500">
                          {player.rounds_scored} round
                          {player.rounds_scored === 1 ? "" : "s"} scored
                        </p>
                      </div>

                      <p className="shrink-0 text-lg font-black text-orange-500">
                        {player.total_points}
                        <span className="ml-1 text-[10px] font-bold uppercase text-zinc-600">
                          pts
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <GroupChatBoard
            groupId={group.id}
            currentUserId={user.id}
            initialMembers={memberRows ?? []}
          />
        </section>
      </div>
    </main>
  );
}