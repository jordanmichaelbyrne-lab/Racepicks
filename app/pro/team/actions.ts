"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

const SALARY_CAP = 31.0;
const MIN_PER_CLASSIFICATION = 2;
const MAX_PER_CLASSIFICATION = 3;
const TEAM_SIZE = 5;

export async function saveTeam(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("pro_access")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.pro_access) {
    return {
      success: false,
      error: "You don't have Racepicks Pro access yet.",
    };
  }

  const season = Number.parseInt(String(formData.get("season") ?? ""), 10);
  const manufacturer = String(formData.get("manufacturer") ?? "").trim();
  const teamName = String(formData.get("team_name") ?? "").trim() || null;
  const riderIds = formData.getAll("rider_ids").map((v) => String(v));

  if (!season) {
    return { success: false, error: "Season is required." };
  }

  if (!manufacturer) {
    return { success: false, error: "Please select a manufacturer." };
  }

  if (riderIds.length !== TEAM_SIZE) {
    return {
      success: false,
      error: `You must select exactly ${TEAM_SIZE} riders (currently ${riderIds.length}).`,
    };
  }

  if (new Set(riderIds).size !== riderIds.length) {
    return { success: false, error: "Each rider can only be selected once." };
  }

  // A team already exists for this player this season? V1 is create-once —
  // editing/transfers are a separate future feature, not silently allowed here.
  const { data: existingTeam } = await supabase
    .from("pro_teams")
    .select("id")
    .eq("user_id", user.id)
    .eq("season", season)
    .maybeSingle();

  if (existingTeam) {
    return {
      success: false,
      error: "You already have a team for this season. Editing/transfers aren't available yet.",
    };
  }

  // Load each selected rider's season data — classification and salary
  // must come from here (Pro-locked values), never from the base
  // riders table.
  const { data: seasonRows, error: seasonError } = await supabase
    .from("pro_rider_seasons")
    .select("rider_id, sx_classification, mx_classification, smx_classification, current_salary, manufacturer, riders(full_name, pro_eligible)")
    .eq("season", season)
    .in("rider_id", riderIds);

  if (seasonError) {
    return { success: false, error: seasonError.message };
  }

  if (!seasonRows || seasonRows.length !== riderIds.length) {
    return {
      success: false,
      error: "One or more selected riders don't have Pro data set up for this season.",
    };
  }

  // Verify manufacturer tier exists (validates it's a real, configured manufacturer).
  const { data: tierRow, error: tierError } = await supabase
    .from("pro_manufacturer_tiers")
    .select("tier")
    .eq("manufacturer", manufacturer)
    .maybeSingle();

  if (tierError) {
    return { success: false, error: tierError.message };
  }

  if (!tierRow) {
    return { success: false, error: `"${manufacturer}" isn't a recognised manufacturer.` };
  }

  // Build validated roster rows, checking eligibility + classification
  // as we go. Uses the CURRENT stage's classification — for simplicity
  // in V1, this uses whichever classification is set (SX taking
  // priority as the season-opening stage). A future enhancement could
  // let this vary by which stage is currently active.
  let totalCost = 0;
  let factoryCount = 0;
  let challengerCount = 0;

  const rosterRows: {
    rider_id: string;
    classification_at_time: string;
    purchase_price: number;
  }[] = [];

  for (const row of seasonRows) {
    const riderInfo = Array.isArray(row.riders) ? row.riders[0] : row.riders;

    if (!riderInfo?.pro_eligible) {
      return {
        success: false,
        error: `${riderInfo?.full_name ?? "A selected rider"} is not currently Pro-eligible.`,
      };
    }

    const classification =
      row.sx_classification || row.mx_classification || row.smx_classification;

    if (!classification) {
      return {
        success: false,
        error: `${riderInfo.full_name} has no classification set for this season yet.`,
      };
    }

    if (!row.current_salary) {
      return {
        success: false,
        error: `${riderInfo.full_name} has no salary set for this season yet.`,
      };
    }

    if (classification === "factory") factoryCount += 1;
    if (classification === "challenger") challengerCount += 1;

    totalCost += row.current_salary;

    rosterRows.push({
      rider_id: row.rider_id,
      classification_at_time: classification,
      purchase_price: row.current_salary,
    });
  }

  // Structure validation: 2-3 Factory AND 2-3 Challenger, summing to 5.
  if (
    factoryCount < MIN_PER_CLASSIFICATION ||
    factoryCount > MAX_PER_CLASSIFICATION ||
    challengerCount < MIN_PER_CLASSIFICATION ||
    challengerCount > MAX_PER_CLASSIFICATION
  ) {
    return {
      success: false,
      error: `Invalid team structure: ${factoryCount} Factory / ${challengerCount} Challenger. Must be 2-3 of each.`,
    };
  }

  // Salary cap validation.
  if (totalCost > SALARY_CAP) {
    return {
      success: false,
      error: `Team costs $${totalCost.toFixed(1)}M, over the $${SALARY_CAP}M cap by $${(totalCost - SALARY_CAP).toFixed(1)}M.`,
    };
  }

  // All validation passed — create the team.
  const { data: newTeam, error: teamInsertError } = await supabase
    .from("pro_teams")
    .insert({
      user_id: user.id,
      season,
      team_name: teamName,
      manufacturer,
      manufacturer_locked_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (teamInsertError || !newTeam) {
    return { success: false, error: teamInsertError?.message ?? "Failed to create team." };
  }

  const { error: rosterInsertError } = await supabase.from("pro_team_riders").insert(
    rosterRows.map((r) => ({
      team_id: newTeam.id,
      rider_id: r.rider_id,
      classification_at_time: r.classification_at_time,
      purchase_price: r.purchase_price,
    }))
  );

  if (rosterInsertError) {
    // Roll back the team row if roster insert fails, so we don't leave
    // an empty/orphaned team behind.
    await supabase.from("pro_teams").delete().eq("id", newTeam.id);
    return { success: false, error: rosterInsertError.message };
  }

  // Audit log — this is the first player-facing action to log, so use
  // the admin-style client isn't right here (this is the player's own
  // action, not an admin's) — log it under the player's own user id.
  await supabase.from("pro_audit_log").insert({
    admin_user_id: user.id,
    admin_email: user.email ?? null,
    action_type: "team_created",
    event_id: null,
    details: {
      season,
      manufacturer,
      total_cost: totalCost,
      factory_count: factoryCount,
      challenger_count: challengerCount,
      rider_ids: riderIds,
    },
  });

  revalidatePath("/pro/team");

  return { success: true };
}