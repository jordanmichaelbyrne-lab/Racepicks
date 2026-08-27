import { createClient } from "@/app/lib/supabase/server";

export type TransferWindow = {
  isOpen: boolean;
  windowStart: Date | null;
  windowEnd: Date | null;
  eventVenue: string | null;
};

// Finds the Monday of the same week as a given date (matches Monday
// salary adjustment day). Uses UTC day-of-week math to stay
// consistent regardless of server timezone.
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// The transfer window for the CURRENT round: opens Monday of that
// round's week, closes at the exact same time normal Racepicks picks
// close for that event. Ties transfers to the active round's real
// cycle rather than a fixed calendar assumption.
export async function getCurrentTransferWindow(): Promise<TransferWindow> {
  const supabase = await createClient();

  const { data: openEvent } = await supabase
    .from("events")
    .select("venue, picks_close_at")
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  let event = openEvent;

  if (!event) {
    const { data: upcomingEvent } = await supabase
      .from("events")
      .select("venue, picks_close_at")
      .eq("status", "upcoming")
      .order("race_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    event = upcomingEvent;
  }

  if (!event) {
    return { isOpen: false, windowStart: null, windowEnd: null, eventVenue: null };
  }

  const windowEnd = new Date(event.picks_close_at);
  const windowStart = getMondayOfWeek(windowEnd);
  const now = new Date();

  return {
    isOpen: now >= windowStart && now <= windowEnd,
    windowStart,
    windowEnd,
    eventVenue: event.venue,
  };
}