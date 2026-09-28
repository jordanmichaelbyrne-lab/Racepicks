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

type SeasonEventInput = {
  season: number;
  status: string;
  race_date: string;
};

/**
 * The season the site is currently "focused" on — the same choice the
 * homepage makes for its featured event:
 *   1. the season of an open event, else
 *   2. the season of the next upcoming event, else
 *   3. the season of the most recently completed event.
 *
 * Between seasons (e.g. the 2026 finale is done and 2027 hasn't
 * started) this is the NEXT season, so the leaderboard rolls over to a
 * fresh board while the old one stays reachable as history.
 *
 * Pure function over already-loaded event rows, so pages that have
 * loaded their events don't need another query.
 */
export function pickFocusSeason(events: SeasonEventInput[]): number | null {
  const sorted = [...events].sort(
    (first, second) =>
      new Date(first.race_date).getTime() -
      new Date(second.race_date).getTime()
  );

  const open = sorted.find((event) => event.status === "open");

  if (open) {
    return open.season;
  }

  const now = Date.now();

  const upcoming = sorted.find(
    (event) =>
      event.status === "upcoming" &&
      new Date(event.race_date).getTime() >= now
  );

  if (upcoming) {
    return upcoming.season;
  }

  const lastCompleted = [...sorted]
    .reverse()
    .find((event) => event.status === "completed");

  return lastCompleted?.season ?? sorted[0]?.season ?? null;
}

export async function getFocusSeason(
  supabase: SupabaseServerClient
): Promise<number | null> {
  const { data, error } = await supabase
    .from("events")
    .select("season, status, race_date");

  if (error) {
    console.error("Focus season: error loading events:", error);
    return null;
  }

  return pickFocusSeason((data ?? []) as SeasonEventInput[]);
}