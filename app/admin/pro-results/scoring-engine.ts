"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

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

  return { supabase, userId: user.id, userEmail: user.email ?? null };
}

type FinishPointsRow = { finishing_position: number; points: number };
type ChallengerBonusRow = {
  result_type: string;
  min_position: number;
  max_position: number;
  bonus_points: number;
};
type EventRulesRow = {
  event_type: string;
  race_1_weight: number;
  race_2_weight: number;
  race_3_weight: number;
  overall_weight: number;
  playoff_multiplier: number;
  holeshot_points: number;
};
type RaceResultRow = {
  result_slot: string;
  rider_id: string;
  finishing_position: number | null;
  status: string;
  had_holeshot: boolean;
};

function findChallengerBonus(
  bonusRows: ChallengerBonusRow[],
  resultType: "overall" | "moto",
  position: number
): number {
  const row = bonusRows.find(
    (r) =>
      r.result_type === resultType &&
      position >= r.min_position &&
      position <= r.max_position
  );
  return row?.bonus_points ?? 0;
}

export async function calculateProRoundScores(
  eventId: string,
  season: number
): Promise<{
  success: boolean;
  error?: string;
  ridersScored?: number;
  manufacturersScored?: number;
}> {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { data: eventConfig, error: eventConfigError } = await supabase
    .from("pro_event_config")
    .select("event_type")
    .eq("event_id", eventId)
    .maybeSingle();

  if (eventConfigError) {
    return { success: false, error: eventConfigError.message };
  }

  if (!eventConfig) {
    return {
      success: false,
      error:
        "This event has no Pro format set (SX / Triple Crown / MX / SMX Playoff).",
    };
  }

  const eventType = eventConfig.event_type;

  const { data: rulesData, error: rulesError } = await supabase
    .from("pro_event_scoring_rules")
    .select("*")
    .eq("event_type", eventType)
    .single();

  if (rulesError || !rulesData) {
    return {
      success: false,
      error: "No scoring rules found for this event format.",
    };
  }

  const rules = rulesData as EventRulesRow;

  const discipline = eventType === "mx" ? "mx" : "sx";

  const { data: finishPointsData, error: finishPointsError } = await supabase
    .from("pro_finish_points")
    .select("finishing_position, points")
    .eq("discipline", discipline);

  if (finishPointsError) {
    return { success: false, error: finishPointsError.message };
  }

  const finishPoints = (finishPointsData ?? []) as FinishPointsRow[];
  const pointsByPosition = new Map(
    finishPoints.map((r) => [r.finishing_position, r.points])
  );

  const { data: bonusData, error: bonusError } = await supabase
    .from("pro_challenger_bonus")
    .select("*");

  if (bonusError) {
    return { success: false, error: bonusError.message };
  }

  const challengerBonusRows = (bonusData ?? []) as ChallengerBonusRow[];

  const { data: resultsData, error: resultsError } = await supabase
    .from("pro_race_results")
    .select("result_slot, rider_id, finishing_position, status, had_holeshot")
    .eq("event_id", eventId);

  if (resultsError) {
    return { success: false, error: resultsError.message };
  }

  const results = (resultsData ?? []) as RaceResultRow[];

  if (results.length === 0) {
    return {
      success: false,
      error: "No results have been entered for this event yet.",
    };
  }

  const stageColumn =
    eventType === "mx"
      ? "mx_classification"
      : eventType.startsWith("smx")
        ? "smx_classification"
        : "sx_classification";

  const riderIds = Array.from(new Set(results.map((r) => r.rider_id)));

  const { data: seasonRows, error: seasonRowsError } = await supabase
    .from("pro_rider_seasons")
    .select(`rider_id, ${stageColumn}`)
    .eq("season", season)
    .in("rider_id", riderIds);

  if (seasonRowsError) {
    return { success: false, error: seasonRowsError.message };
  }

  const classificationByRiderId = new Map(
    (seasonRows ?? []).map((r: any) => [r.rider_id, r[stageColumn]])
  );

  const resultsByRider = new Map<string, RaceResultRow[]>();
  for (const r of results) {
    const list = resultsByRider.get(r.rider_id) ?? [];
    list.push(r);
    resultsByRider.set(r.rider_id, list);
  }

  const slotWeights: Record<string, number> = {
    race_1: rules.race_1_weight,
    race_2: rules.race_2_weight,
    race_3: rules.race_3_weight,
    overall: rules.overall_weight,
  };

  const scoreRows: {
    event_id: string;
    rider_id: string;
    season: number;
    base_points: number;
    challenger_bonus: number;
    holeshot_bonus: number;
    pre_multiplier_total: number;
    playoff_multiplier: number;
    total_points: number;
    calculated_at: string;
  }[] = [];

  for (const [riderId, riderResults] of resultsByRider.entries()) {
    const isChallenger = classificationByRiderId.get(riderId) === "challenger";

    let basePoints = 0;
    let challengerBonus = 0;
    let holeshotBonus = 0;

    for (const result of riderResults) {
      const weight = slotWeights[result.result_slot] ?? 0;
      if (weight === 0) continue;

      const position =
        result.status === "classified" ? result.finishing_position : null;

      if (position !== null) {
        const finishPts = pointsByPosition.get(position) ?? 0;
        basePoints += finishPts * weight;

        if (isChallenger) {
          const bonusType = result.result_slot === "overall" ? "overall" : "moto";
          challengerBonus += findChallengerBonus(
            challengerBonusRows,
            bonusType,
            position
          );
        }
      }

      if (result.had_holeshot) {
        holeshotBonus += rules.holeshot_points;
      }
    }

    const preMultiplierTotal = basePoints + challengerBonus + holeshotBonus;
    const totalPoints = Math.round(preMultiplierTotal * rules.playoff_multiplier);

    scoreRows.push({
      event_id: eventId,
      rider_id: riderId,
      season,
      base_points: Math.round(basePoints * 100) / 100,
      challenger_bonus: challengerBonus,
      holeshot_bonus: holeshotBonus,
      pre_multiplier_total: Math.round(preMultiplierTotal * 100) / 100,
      playoff_multiplier: rules.playoff_multiplier,
      total_points: totalPoints,
      calculated_at: new Date().toISOString(),
    });
  }

  const { error: upsertError } = await supabase
    .from("pro_round_scores")
    .upsert(scoreRows, { onConflict: "event_id,rider_id" });

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  // ============================================================
  // Manufacturer bonus — calculated from the Official Overall slot
  // only (not individual motos/races). Only the highest-finishing
  // eligible rider per manufacturer counts, and bonuses are NOT
  // cumulative across position bands.
  // ============================================================

  const overallResults = results.filter(
    (r) => r.result_slot === "overall" && r.status === "classified" && r.finishing_position !== null
  );

  const { data: manufacturerSeasonRows, error: manufacturerSeasonError } =
    await supabase
      .from("pro_rider_seasons")
      .select("rider_id, manufacturer")
      .eq("season", season)
      .in("rider_id", riderIds);

  if (manufacturerSeasonError) {
    return { success: false, error: manufacturerSeasonError.message };
  }

  const manufacturerByRiderId = new Map(
    (manufacturerSeasonRows ?? []).map((r) => [r.rider_id, r.manufacturer])
  );

  const { data: tierData, error: tierError } = await supabase
    .from("pro_manufacturer_tiers")
    .select("manufacturer, tier");

  if (tierError) {
    return { success: false, error: tierError.message };
  }

  const tierByManufacturer = new Map(
    (tierData ?? []).map((t) => [t.manufacturer, t.tier])
  );

  const { data: manufacturerBonusData, error: manufacturerBonusError } =
    await supabase.from("pro_manufacturer_bonus").select("*");

  if (manufacturerBonusError) {
    return { success: false, error: manufacturerBonusError.message };
  }

  type ManufacturerBonusRow = {
    manufacturer_tier: string;
    min_position: number;
    max_position: number;
    bonus_points: number;
  };

  const manufacturerBonusRows =
    (manufacturerBonusData ?? []) as ManufacturerBonusRow[];

  // Find each manufacturer's best (lowest) finishing position this round.
  const bestByManufacturer = new Map<
    string,
    { riderId: string; position: number }
  >();

  for (const result of overallResults) {
    const manufacturer = manufacturerByRiderId.get(result.rider_id);
    if (!manufacturer || result.finishing_position === null) continue;

    const current = bestByManufacturer.get(manufacturer);
    if (!current || result.finishing_position < current.position) {
      bestByManufacturer.set(manufacturer, {
        riderId: result.rider_id,
        position: result.finishing_position,
      });
    }
  }

  const manufacturerScoreRows: {
    event_id: string;
    manufacturer: string;
    tier: string | null;
    best_rider_id: string | null;
    best_position: number | null;
    bonus_points: number;
    calculated_at: string;
  }[] = [];

  for (const [manufacturer, best] of bestByManufacturer.entries()) {
    const tier = tierByManufacturer.get(manufacturer) ?? null;

    const bonusRow = tier
      ? manufacturerBonusRows.find(
          (b) =>
            b.manufacturer_tier === tier &&
            best.position >= b.min_position &&
            best.position <= b.max_position
        )
      : null;

    manufacturerScoreRows.push({
      event_id: eventId,
      manufacturer,
      tier,
      best_rider_id: best.riderId,
      best_position: best.position,
      bonus_points: bonusRow?.bonus_points ?? 0,
      calculated_at: new Date().toISOString(),
    });
  }

  if (manufacturerScoreRows.length > 0) {
    const { error: manufacturerUpsertError } = await supabase
      .from("pro_manufacturer_round_scores")
      .upsert(manufacturerScoreRows, { onConflict: "event_id,manufacturer" });

    if (manufacturerUpsertError) {
      return { success: false, error: manufacturerUpsertError.message };
    }
  }

  revalidatePath("/admin/pro-results");

  await supabase.from("pro_audit_log").insert({
    admin_user_id: userId,
    admin_email: userEmail,
    action_type: "scores_calculated",
    event_id: eventId,
    details: {
      riders_scored: scoreRows.length,
      manufacturers_scored: manufacturerScoreRows.length,
      event_type: eventType,
    },
  });

  return {
    success: true,
    ridersScored: scoreRows.length,
    manufacturersScored: manufacturerScoreRows.length,
  };
}