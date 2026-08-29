import { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SeriesStandingRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  series_points: number;
  rounds_scored: number;
  best_round: number;
};

/**
 * Full ranked standings for one series within one season (e.g. every
 * player's Racepicks points across just the 2026 Pro Motocross rounds).
 * Same underlying calculation as the series-finale celebration popup,
 * but returns everyone, not just the top 3 — meant for a permanent,
 * browsable standings table rather than a one-time announcement.
 */
export async function getSeriesStandings(
  supabase: SupabaseServerClient,
  series: string,
  season: number
): Promise<SeriesStandingRow[]> {
  const { data: seriesEvents, error: seriesEventsError } = await supabase
    .from("events")
    .select("id")
    .eq("series", series)
    .eq("season", season);

  if (seriesEventsError) {
    console.error(
      "Series standings: error loading series events:",
      seriesEventsError
    );
    return [];
  }

  const seriesEventIds = (seriesEvents ?? []).map((event) => event.id);

  if (seriesEventIds.length === 0) {
    return [];
  }

  const { data: seriesScoreRows, error: seriesScoresError } =
    await supabase
      .from("scores")
      .select("user_id, round_points")
      .in("event_id", seriesEventIds);

  if (seriesScoresError) {
    console.error(
      "Series standings: error loading scores:",
      seriesScoresError
    );
    return [];
  }

  const totalsByUser = new Map<
    string,
    { points: number; rounds: number; best: number }
  >();

  for (const row of seriesScoreRows ?? []) {
    const current = totalsByUser.get(row.user_id) ?? {
      points: 0,
      rounds: 0,
      best: 0,
    };

    current.points += row.round_points ?? 0;
    current.rounds += 1;
    current.best = Math.max(current.best, row.round_points ?? 0);

    totalsByUser.set(row.user_id, current);
  }

  const sorted = Array.from(totalsByUser.entries()).sort(
    (first, second) => second[1].points - first[1].points
  );

  const userIds = sorted.map(([userId]) => userId);

  let profileById = new Map<
    string,
    { display_name: string; avatar_url: string | null }
  >();

  if (userIds.length > 0) {
    // Public-safe profile lookup — same view used everywhere else
    // another player's name/avatar needs to be shown.
    const { data: profiles, error: profilesError } = await supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error(
        "Series standings: error loading profiles:",
        profilesError
      );
    }

    profileById = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        },
      ])
    );
  }

  return sorted.map(([userId, totals]) => ({
    user_id: userId,
    display_name:
      profileById.get(userId)?.display_name ?? "Racepicks Player",
    avatar_url: profileById.get(userId)?.avatar_url ?? null,
    series_points: totals.points,
    rounds_scored: totals.rounds,
    best_round: totals.best,
  }));
}