import { createClient } from "@/app/lib/supabase/server";

export type RiderRoundPoint = {
  eventId: string;
  venue: string;
  points: number;
  raceDate: string;
};

// Per-rider, ordered list of round-by-round scores for the season —
// needed for sparklines and slump detection, which the season-total
// aggregate in pointsByRiderId can't show on its own.
export async function getRiderRoundHistories(
  riderIds: string[],
  season: number
): Promise<Map<string, RiderRoundPoint[]>> {
  const map = new Map<string, RiderRoundPoint[]>();
  if (riderIds.length === 0) return map;

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("pro_round_scores")
    .select("rider_id, total_points, event_id, events(venue, race_date, season)")
    .in("rider_id", riderIds);

  for (const row of rows ?? []) {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!event || event.season !== season) continue;

    const entry: RiderRoundPoint = {
      eventId: row.event_id,
      venue: event.venue,
      points: row.total_points,
      raceDate: event.race_date,
    };

    const existing = map.get(row.rider_id) ?? [];
    existing.push(entry);
    map.set(row.rider_id, existing);
  }

  for (const entries of map.values()) {
    entries.sort((a, b) => (a.raceDate < b.raceDate ? -1 : 1));
  }

  return map;
}

// A rider is "slumping" when their last 3 scored rounds have each
// been strictly lower than the one before — a real, sustained
// decline rather than one bad round or normal week-to-week noise.
export function isSlumping(history: RiderRoundPoint[]): boolean {
  if (history.length < 3) return false;
  const last3 = history.slice(-3).map((h) => h.points);
  return last3[0] > last3[1] && last3[1] > last3[2];
}