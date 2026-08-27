import { createClient } from "@/app/lib/supabase/server";

// The SMX-non-qualification free transfer should only ever be
// relevant once the MX season has genuinely finished — before that,
// smx_active is just a preseason placeholder, not a real outcome.
// "Concluded" = there are no remaining MX events for the season that
// aren't already completed.
export async function hasMxSeasonConcluded(season: number): Promise<boolean> {
  const supabase = await createClient();

  const { data: pendingMxEvents } = await supabase
    .from("events")
    .select("id")
    .eq("season", season)
    .eq("series", "Motocross")
    .neq("status", "completed")
    .limit(1);

  return (pendingMxEvents ?? []).length === 0;
}