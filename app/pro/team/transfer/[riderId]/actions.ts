"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentTransferWindow } from "@/app/pro/lib/transferWindow";
import { hasMxSeasonConcluded } from "@/app/pro/lib/seasonStage";

const SALARY_CAP = 31.0;
const FACTORY_TOKEN_LIMIT = 3;
const CHALLENGER_TOKEN_LIMIT = 5;

export type TransferResult = { success: boolean; error?: string };

export async function executeTransfer(
  teamId: string,
  season: number,
  outRiderId: string,
  inRiderId: string
): Promise<TransferResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Transfer window check — authoritative, first thing checked. The
  // UI hides the picker outside this window too, but this is what
  // actually stops it, regardless of what the client sends.
  const window = await getCurrentTransferWindow();

  if (!window.isOpen) {
    const reopenText = window.windowStart
      ? ` Transfers reopen Monday.`
      : "";
    return {
      success: false,
      error: `Transfers are closed right now — open from Monday through picks close each week.${reopenText}`,
    };
  }

  // Confirm ownership.
  const { data: team, error: teamError } = await supabase
    .from("pro_teams")
    .select("id, user_id, manufacturer")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    return { success: false, error: "Team not found." };
  }

  if (team.user_id !== user.id) {
    return { success: false, error: "This isn't your team." };
  }

  // Confirm the outgoing rider is genuinely on the active roster.
  const { data: outgoingRow, error: outgoingError } = await supabase
    .from("pro_team_riders")
    .select("id, classification_at_time, purchase_price")
    .eq("team_id", teamId)
    .eq("rider_id", outRiderId)
    .is("removed_at", null)
    .maybeSingle();

  if (outgoingError || !outgoingRow) {
    return { success: false, error: "That rider isn't currently on your roster." };
  }

  // Load the outgoing rider's CURRENT season data — needed for sale
  // price (profit-sharing rule) and for detecting free-transfer eligibility.
  const { data: outgoingSeasonRow, error: outgoingSeasonError } = await supabase
    .from("pro_rider_seasons")
    .select("current_salary, injury_status, injury_transfer_eligible, smx_active, riders(full_name)")
    .eq("rider_id", outRiderId)
    .eq("season", season)
    .maybeSingle();

  if (outgoingSeasonError || !outgoingSeasonRow) {
    return { success: false, error: "Couldn't load the outgoing rider's season data." };
  }

  const outgoingRiderInfo = Array.isArray(outgoingSeasonRow.riders)
    ? outgoingSeasonRow.riders[0]
    : outgoingSeasonRow.riders;

  // Determine free-transfer eligibility — genuinely confirmed injury,
  // or failed SMX qualification. No admin discretion needed for the
  // SMX case; it's a straight read of smx_active.
  let isFreeTransfer = false;
  let freeTransferReason: "injury" | "smx_non_qualification" | null = null;

  if (outgoingSeasonRow.injury_transfer_eligible) {
    isFreeTransfer = true;
    freeTransferReason = "injury";
  } else if (outgoingSeasonRow.smx_active === false) {
    const mxConcluded = await hasMxSeasonConcluded(season);
    if (mxConcluded) {
      isFreeTransfer = true;
      freeTransferReason = "smx_non_qualification";
    }
  }

  // Profit-sharing rule: 50% of any gain, 100% of any loss.
  const marketValue = outgoingSeasonRow.current_salary ?? outgoingRow.purchase_price;
  const purchasePrice = outgoingRow.purchase_price;
  const soldPrice =
    marketValue > purchasePrice
      ? purchasePrice + (marketValue - purchasePrice) * 0.5
      : marketValue;

  // Load incoming rider's season data.
  const { data: incomingSeasonRow, error: incomingSeasonError } = await supabase
    .from("pro_rider_seasons")
    .select(
      "current_salary, sx_classification, mx_classification, smx_classification, riders(full_name, pro_eligible)"
    )
    .eq("rider_id", inRiderId)
    .eq("season", season)
    .maybeSingle();

  if (incomingSeasonError || !incomingSeasonRow) {
    return { success: false, error: "Couldn't load the incoming rider's season data." };
  }

  const incomingRiderInfo = Array.isArray(incomingSeasonRow.riders)
    ? incomingSeasonRow.riders[0]
    : incomingSeasonRow.riders;

  if (!incomingRiderInfo?.pro_eligible) {
    return { success: false, error: `${incomingRiderInfo?.full_name ?? "That rider"} is not Pro-eligible.` };
  }

  const incomingClassification =
    incomingSeasonRow.sx_classification ||
    incomingSeasonRow.mx_classification ||
    incomingSeasonRow.smx_classification;

  if (!incomingClassification || !incomingSeasonRow.current_salary) {
    return { success: false, error: "The incoming rider has no Pro data set up yet." };
  }

  // Already on the team?
  const { data: alreadyOnTeam } = await supabase
    .from("pro_team_riders")
    .select("id")
    .eq("team_id", teamId)
    .eq("rider_id", inRiderId)
    .is("removed_at", null)
    .maybeSingle();

  if (alreadyOnTeam) {
    return { success: false, error: `${incomingRiderInfo.full_name} is already on your team.` };
  }

  const outClassification = outgoingRow.classification_at_time;
  const isStructureChange = outClassification !== incomingClassification;

  const factoryTokensNeeded = isStructureChange ? 1 : outClassification === "factory" ? 1 : 0;
  const challengerTokensNeeded = isStructureChange ? 1 : outClassification === "challenger" ? 1 : 0;

  // Check token availability, unless this is a free transfer.
  if (!isFreeTransfer) {
    const { data: pastTransfers } = await supabase
      .from("pro_transfers")
      .select("factory_tokens_used, challenger_tokens_used")
      .eq("team_id", teamId)
      .eq("season", season)
      .eq("is_free_transfer", false);

    const factoryUsed = (pastTransfers ?? []).reduce((sum, t) => sum + t.factory_tokens_used, 0);
    const challengerUsed = (pastTransfers ?? []).reduce(
      (sum, t) => sum + t.challenger_tokens_used,
      0
    );

    if (factoryTokensNeeded > 0 && factoryUsed + factoryTokensNeeded > FACTORY_TOKEN_LIMIT) {
      return { success: false, error: "You don't have enough Factory transfers remaining." };
    }

    if (
      challengerTokensNeeded > 0 &&
      challengerUsed + challengerTokensNeeded > CHALLENGER_TOKEN_LIMIT
    ) {
      return { success: false, error: "You don't have enough Challenger transfers remaining." };
    }
  }

  // Cap check — rest of the roster's current value, plus the incoming
  // rider, must stay within $31.0M.
  const { data: restOfRoster } = await supabase
    .from("pro_team_riders")
    .select("rider_id")
    .eq("team_id", teamId)
    .is("removed_at", null)
    .neq("rider_id", outRiderId);

  const restRiderIds = (restOfRoster ?? []).map((r) => r.rider_id);

  const { data: restSalaries } = await supabase
    .from("pro_rider_seasons")
    .select("current_salary")
    .eq("season", season)
    .in("rider_id", restRiderIds.length > 0 ? restRiderIds : [""]);

  const restTotal = (restSalaries ?? []).reduce((sum, r) => sum + (r.current_salary ?? 0), 0);
  const newTotal = restTotal + incomingSeasonRow.current_salary;

  if (newTotal > SALARY_CAP) {
    return {
      success: false,
      error: `This swap would put your team at $${newTotal.toFixed(1)}M, over the $${SALARY_CAP}M cap.`,
    };
  }

  // All validated — execute the swap.
  const now = new Date().toISOString();

  const { error: closeOutError } = await supabase
    .from("pro_team_riders")
    .update({
      removed_at: now,
      sold_price: soldPrice,
      removal_reason: isFreeTransfer
        ? freeTransferReason === "injury"
          ? "free_injury_transfer"
          : "free_smx_non_qualification_transfer"
        : "transfer",
    })
    .eq("id", outgoingRow.id);

  if (closeOutError) {
    return { success: false, error: closeOutError.message };
  }

  const { error: addNewError } = await supabase.from("pro_team_riders").insert({
    team_id: teamId,
    rider_id: inRiderId,
    classification_at_time: incomingClassification,
    purchase_price: incomingSeasonRow.current_salary,
    added_at: now,
  });

  if (addNewError) {
    return { success: false, error: addNewError.message };
  }

  const { error: logError } = await supabase.from("pro_transfers").insert({
    team_id: teamId,
    season,
    out_rider_id: outRiderId,
    in_rider_id: inRiderId,
    out_classification: outClassification,
    in_classification: incomingClassification,
    factory_tokens_used: isFreeTransfer ? 0 : factoryTokensNeeded,
    challenger_tokens_used: isFreeTransfer ? 0 : challengerTokensNeeded,
    is_free_transfer: isFreeTransfer,
    free_transfer_reason: freeTransferReason,
    sold_price: soldPrice,
    purchase_price: incomingSeasonRow.current_salary,
    transferred_by: user.id,
  });

  if (logError) {
    console.error("Transfer log insert failed:", logError);
    // Don't fail the whole transfer over a logging error — the swap
    // itself already succeeded.
  }

  revalidatePath("/pro/team");

  return { success: true };
}