import { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The "current" season is whichever season the most relevant event
 * belongs to — an open event if one exists, otherwise the most
 * recently completed one, otherwise the earliest upcoming one. Same
 * cascading logic already used to pick the homepage's featured event,
 * just returning the season number instead of the event itself.
 *
 * This is what separates "this season's tabs" (shown directly on the
 * leaderboard) from "history" (a past season, browsable separately) —
 * so the distinction always tracks whatever season is actually live,
 * with no manual toggling needed as years roll over.
 */
export async function getCurrentSeason(
  supabase: SupabaseServerClient
): Promise<number | null> {
  const { data: openEvent } = await supabase
    .from("events")
    .select("season")
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (openEvent) {
    return openEvent.season;
  }

  const { data: completedEvent } = await supabase
    .from("events")
    .select("season")
    .eq("status", "completed")
    .order("race_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (completedEvent) {
    return completedEvent.season;
  }

  const { data: upcomingEvent } = await supabase
    .from("events")
    .select("season")
    .eq("status", "upcoming")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  return upcomingEvent?.season ?? null;
}