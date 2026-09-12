"use server";

import { createClient } from "./supabase/server";
import { getSeriesStandings } from "./series-standings";

export type CompetitionStandingsResult = {
  season: number;
  series: string;
  standings: Awaited<ReturnType<typeof getSeriesStandings>>;
};

/**
 * Called directly from the client-side leaderboard tabs — no route
 * change, no page navigation. Resolves a competition_slug (e.g.
 * "2026-smx") to its season+series, then reuses the exact same
 * getSeriesStandings() calculation already powering each
 * competition's own page, so the numbers can never drift out of
 * sync between the two places they're shown.
 */
export async function getCompetitionStandingsAction(
  competitionSlug: string
): Promise<CompetitionStandingsResult | null> {
  const supabase = await createClient();

  const { data: firstEvent, error } = await supabase
    .from("events")
    .select("season, series")
    .eq("competition_slug", competitionSlug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Competition standings action: event lookup error:", error);
    return null;
  }

  if (!firstEvent) {
    return null;
  }

  const standings = await getSeriesStandings(
    supabase,
    firstEvent.series,
    firstEvent.season
  );

  return {
    season: firstEvent.season,
    series: firstEvent.series,
    standings,
  };
}