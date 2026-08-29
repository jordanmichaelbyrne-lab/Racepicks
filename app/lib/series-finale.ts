import { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * An event is a "series finale" when no LATER round exists in the same
 * series + season. This is the single source of truth for that check —
 * both the results-publish rollover's own event-loading and the results
 * email / results page use this exact same definition, so they can never
 * silently disagree about which round was the last one in a series.
 */
export async function isSeriesFinaleEvent(
  supabase: SupabaseServerClient,
  series: string,
  season: number,
  roundNumber: number
): Promise<boolean> {
  const { data: laterEventsInSeries, error } = await supabase
    .from("events")
    .select("id")
    .eq("series", series)
    .eq("season", season)
    .gt("round_number", roundNumber)
    .limit(1);

  if (error) {
    console.error("Series finale check error:", error);
    // Fail closed: if we can't tell, treat it as NOT a finale rather than
    // risk sending the wrong email or showing the wrong popup.
    return false;
  }

  return !laterEventsInSeries || laterEventsInSeries.length === 0;
}

export function formatSeriesName(series: string) {
  const normalised = series.trim().toLowerCase();

  if (normalised === "motocross" || normalised === "mx") {
    return "Pro Motocross";
  }

  if (normalised === "supercross" || normalised === "sx") {
    return "Supercross";
  }

  if (normalised === "smx") {
    return "SMX";
  }

  return series;
}