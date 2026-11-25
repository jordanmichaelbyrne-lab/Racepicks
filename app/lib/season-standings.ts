import { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SeasonStandingRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rounds_scored: number;
  total_points: number;
  best_round: number;
};

export type ScoreRow = {
  user_id: string;
  event_id: string;
  round_points: number | null;
};

// Supabase returns at most 1,000 rows per request by default. A full
// season (e.g. 50 players x 31 rounds) is ~1,550 score rows, so reading
// them in one go would silently truncate and produce wrong totals.
const PAGE_SIZE = 1000;

// Batches profile lookups so a big field never builds an oversized URL.
const PROFILE_BATCH_SIZE = 100;

/**
 * Every score row for the given events, read page by page.
 * Returns null if any page fails, so callers never treat a partial
 * read as a complete one.
 */
export async function fetchScoreRows(
  supabase: SupabaseServerClient,
  eventIds: string[]
): Promise<ScoreRow[] | null> {
  if (eventIds.length === 0) {
    return [];
  }

  const rows: ScoreRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("scores")
      .select("user_id, event_id, round_points")
      .in("event_id", eventIds)
      .order("user_id", { ascending: true })
      .order("event_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Score rows: error loading a page of scores:", error);
      return null;
    }

    rows.push(...((data ?? []) as ScoreRow[]));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

/**
 * Full ranked standings for ONE season, across every series in it
 * (Supercross + Motocross + SMX). This is the season-scoped version of
 * the all-time `leaderboard` view: when a new season starts it begins
 * at zero instead of carrying last year's points forward.
 *
 * Only players with at least one scored round in that season appear.
 */
export async function getSeasonStandings(
  supabase: SupabaseServerClient,
  season: number
): Promise<SeasonStandingRow[]> {
  const { data: seasonEvents, error: eventsError } = await supabase
    .from("events")
    .select("id")
    .eq("season", season);

  if (eventsError) {
    console.error("Season standings: error loading events:", eventsError);
    return [];
  }

  const eventIds = (seasonEvents ?? []).map((event) => event.id);

  const scoreRows = await fetchScoreRows(supabase, eventIds);

  if (!scoreRows) {
    return [];
  }

  return standingsFromScoreRows(supabase, scoreRows);
}

/**
 * Ranks players from score rows that have ALREADY been fetched (all
 * from one season). Split out so a page that needs both the raw rows
 * and the ranking reads the scores once, not twice.
 */
export async function standingsFromScoreRows(
  supabase: SupabaseServerClient,
  scoreRows: ScoreRow[]
): Promise<SeasonStandingRow[]> {
  const totalsByUser = new Map<
    string,
    { points: number; rounds: number; best: number }
  >();

  for (const row of scoreRows) {
    const current = totalsByUser.get(row.user_id) ?? {
      points: 0,
      rounds: 0,
      best: 0,
    };

    const points = row.round_points ?? 0;

    current.points += points;
    current.rounds += 1;
    current.best = Math.max(current.best, points);

    totalsByUser.set(row.user_id, current);
  }

  const userIds = Array.from(totalsByUser.keys());

  const profileById = new Map<
    string,
    { display_name: string | null; avatar_url: string | null }
  >();

  for (let i = 0; i < userIds.length; i += PROFILE_BATCH_SIZE) {
    const batch = userIds.slice(i, i + PROFILE_BATCH_SIZE);

    // Public-safe view: other players' names/avatars only.
    const { data: profiles, error: profilesError } = await supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .in("id", batch);

    if (profilesError) {
      console.error("Season standings: error loading profiles:", profilesError);
      continue;
    }

    for (const profile of profiles ?? []) {
      profileById.set(profile.id, {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      });
    }
  }

  return userIds
    .map((userId) => {
      const totals = totalsByUser.get(userId)!;
      const profile = profileById.get(userId);

      return {
        user_id: userId,
        display_name: profile?.display_name?.trim() || "MX Gatepicks Player",
        avatar_url: profile?.avatar_url ?? null,
        rounds_scored: totals.rounds,
        total_points: totals.points,
        best_round: totals.best,
      };
    })
    .sort(
      (first, second) =>
        second.total_points - first.total_points ||
        first.display_name.localeCompare(second.display_name)
    );
}