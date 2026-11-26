"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

// ---- Tuning knobs (change these to change how prices move) ----
const MAX_MOVE_PCT = 5; // hard cap per Monday, up or down
const FORM_ROUNDS = 3; // how many recent scored rounds count as "form"
const SENSITIVITY = 10; // 50% above expected form = the full +5%

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return { supabase, userId: user.id };
}

export type AutoResult = {
  success: boolean;
  error?: string;
  count?: number;
  skipped?: number;
};

// Fills in suggested_salary for every rider with scored rounds this
// season. Nothing is applied — the admin still reviews and accepts.
//
// How it works: each rider's "expected" points is their salary times
// the field's points-per-$M. A rider scoring above expected over their
// last few rounds is suggested up, below expected suggested down,
// capped at ±MAX_MOVE_PCT and rounded to $0.1M.
export async function generateSuggestedSalaries(
  season: number
): Promise<AutoResult> {
  const { supabase } = await requireAdmin();

  const { data: seasonRows, error: seasonError } = await supabase
    .from("pro_rider_seasons")
    .select("rider_id, current_salary, riders(pro_eligible)")
    .eq("season", season)
    .not("current_salary", "is", null);

  if (seasonError) {
    return { success: false, error: seasonError.message };
  }

  const eligible = (seasonRows ?? [])
    .map((row) => {
      const rider = Array.isArray(row.riders) ? row.riders[0] : row.riders;
      return rider?.pro_eligible
        ? { riderId: row.rider_id as string, salary: row.current_salary as number }
        : null;
    })
    .filter((r): r is { riderId: string; salary: number } => r !== null);

  if (eligible.length === 0) {
    return { success: false, error: "No Pro-eligible riders with salaries found." };
  }

  const riderIds = eligible.map((r) => r.riderId);

  const { data: scoreRows, error: scoreError } = await supabase
    .from("pro_round_scores")
    .select("rider_id, total_points, events(race_date, season)")
    .in("rider_id", riderIds);

  if (scoreError) {
    return { success: false, error: scoreError.message };
  }

  const historyByRider = new Map<string, { date: string; points: number }[]>();

  for (const row of scoreRows ?? []) {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!event || event.season !== season) continue;

    const list = historyByRider.get(row.rider_id) ?? [];
    list.push({ date: event.race_date, points: row.total_points });
    historyByRider.set(row.rider_id, list);
  }

  const form = eligible
    .map((r) => {
      const history = (historyByRider.get(r.riderId) ?? [])
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(-FORM_ROUNDS);

      if (history.length === 0) return null;

      const avg = history.reduce((s, h) => s + h.points, 0) / history.length;
      return { ...r, avg };
    })
    .filter((r): r is { riderId: string; salary: number; avg: number } => r !== null);

  if (form.length === 0) {
    return {
      success: false,
      error: "No scored rounds yet — calculate scores for a round first.",
    };
  }

  const totalSalary = form.reduce((s, r) => s + r.salary, 0);
  const totalAvg = form.reduce((s, r) => s + r.avg, 0);
  const pointsPerMillion = totalSalary > 0 ? totalAvg / totalSalary : 0;

  if (pointsPerMillion <= 0) {
    return { success: false, error: "Not enough scoring data to work out expected form." };
  }

  let count = 0;
  const updates = form.map((r) => {
    const expected = r.salary * pointsPerMillion;
    const ratio = expected > 0 ? r.avg / expected : 1;
    const rawPct = (ratio - 1) * SENSITIVITY;
    const pct = Math.max(-MAX_MOVE_PCT, Math.min(MAX_MOVE_PCT, rawPct));
    const newSalary = Math.round(r.salary * (1 + pct / 100) * 10) / 10;

    return { riderId: r.riderId, suggested: newSalary === r.salary ? null : newSalary };
  });

  for (let i = 0; i < updates.length; i += 10) {
    const chunk = updates.slice(i, i + 10);
    const results = await Promise.all(
      chunk.map((u) =>
        supabase
          .from("pro_rider_seasons")
          .update({
            suggested_salary: u.suggested,
            updated_at: new Date().toISOString(),
          })
          .eq("rider_id", u.riderId)
          .eq("season", season)
      )
    );

    for (const res of results) {
      if (res.error) {
        return { success: false, error: res.error.message };
      }
    }

    count += chunk.filter((u) => u.suggested !== null).length;
  }

  revalidatePath("/admin/pro-riders/monday-review");

  return { success: true, count, skipped: eligible.length - form.length };
}

// Accepts every pending suggestion that is within the ±MAX_MOVE_PCT
// cap. Anything outside the cap is left for manual review.
export async function acceptAllSuggestedSalaries(
  season: number
): Promise<AutoResult> {
  const { supabase, userId } = await requireAdmin();

  const { data: rows, error } = await supabase
    .from("pro_rider_seasons")
    .select("rider_id, current_salary, suggested_salary")
    .eq("season", season)
    .not("suggested_salary", "is", null)
    .not("current_salary", "is", null);

  if (error) {
    return { success: false, error: error.message };
  }

  let count = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const previous = row.current_salary as number;
    const next = row.suggested_salary as number;
    const pct = previous ? ((next - previous) / previous) * 100 : 0;

    if (Math.abs(pct) > MAX_MOVE_PCT + 0.001) {
      skipped += 1;
      continue;
    }

    const changePercent = Math.round(pct * 10) / 10;

    const { error: updateError } = await supabase
      .from("pro_rider_seasons")
      .update({
        current_salary: next,
        previous_salary: previous,
        salary_change_percent: changePercent,
        salary_updated_at: new Date().toISOString(),
        suggested_salary: null,
        updated_at: new Date().toISOString(),
      })
      .eq("rider_id", row.rider_id)
      .eq("season", season);

    if (updateError) {
      return { success: false, error: updateError.message, count, skipped };
    }

    if (previous !== next) {
      await supabase.from("pro_salary_history").insert({
        rider_id: row.rider_id,
        season,
        old_salary: previous,
        new_salary: next,
        change_percent: changePercent,
        changed_by: userId,
      });
    }

    count += 1;
  }

  revalidatePath("/admin/pro-riders");
  revalidatePath("/admin/pro-riders/monday-review");

  return { success: true, count, skipped };
}