import { createClient } from "@/app/lib/supabase/server";

export type SalaryTrend = {
  direction: "up" | "down" | "flat" | "none";
  changePercent: number | null;
};

// Looks up each rider's MOST RECENT salary_history entry for the
// season. Returns "none" for anyone with no history yet — which,
// before the season starts, is genuinely everyone. Real up/down
// trends appear automatically the first Monday adjustment happens,
// no code change needed then.
export async function getSalaryTrends(
  riderIds: string[],
  season: number
): Promise<Map<string, SalaryTrend>> {
  const trends = new Map<string, SalaryTrend>();

  if (riderIds.length === 0) return trends;

  const supabase = await createClient();

  const { data: historyRows } = await supabase
    .from("pro_salary_history")
    .select("rider_id, change_percent, effective_at")
    .eq("season", season)
    .in("rider_id", riderIds)
    .order("effective_at", { ascending: false });

  const seenRiderIds = new Set<string>();

  for (const row of historyRows ?? []) {
    // Already found this rider's most recent entry — skip older ones.
    if (seenRiderIds.has(row.rider_id)) continue;
    seenRiderIds.add(row.rider_id);

    const pct = row.change_percent ?? 0;
    trends.set(row.rider_id, {
      direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
      changePercent: pct,
    });
  }

  for (const riderId of riderIds) {
    if (!trends.has(riderId)) {
      trends.set(riderId, { direction: "none", changePercent: null });
    }
  }

  return trends;
}