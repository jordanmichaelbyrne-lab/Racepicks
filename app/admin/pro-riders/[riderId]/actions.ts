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

  return { supabase, userId: user.id };
}

function parseClassification(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str === "factory" || str === "challenger" ? str : null;
}

function parseSalary(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const num = Number.parseFloat(str);
  return Number.isFinite(num) ? num : null;
}

export async function saveProRiderSeason(formData: FormData) {
  const { supabase, userId } = await requireAdmin();

  const riderId = String(formData.get("rider_id") ?? "").trim();
  const season = Number.parseInt(String(formData.get("season") ?? ""), 10);

  if (!riderId || !season) {
    throw new Error("Rider ID and season are required.");
  }

  const proEligible = formData.get("pro_eligible") === "on";
  const manufacturer = String(formData.get("manufacturer") ?? "").trim() || null;
  const sxClassification = parseClassification(formData.get("sx_classification"));
  const mxClassification = parseClassification(formData.get("mx_classification"));
  const smxClassification = parseClassification(formData.get("smx_classification"));
  const salaryCategory = String(formData.get("salary_category") ?? "").trim() || null;
  const startingSalary = parseSalary(formData.get("starting_salary"));
  const newCurrentSalary = parseSalary(formData.get("current_salary"));
  const sxActive = formData.get("sx_active") === "on";
  const mxActive = formData.get("mx_active") === "on";
  const smxActive = formData.get("smx_active") === "on";
  const injuryStatus = String(formData.get("injury_status") ?? "healthy");
  const injuryTransferEligible = formData.get("injury_transfer_eligible") === "on";
  const adminNotes = String(formData.get("admin_notes") ?? "").trim() || null;

  // Check for an existing row, so we can detect a real salary change
  // and log it to the audit history.
  const { data: existingRow, error: existingRowError } = await supabase
    .from("pro_rider_seasons")
    .select("current_salary")
    .eq("rider_id", riderId)
    .eq("season", season)
    .maybeSingle();

  if (existingRowError) {
    console.error("Pro rider season lookup error:", existingRowError);
    throw new Error(existingRowError.message);
  }

  const previousSalary = existingRow?.current_salary ?? null;

  const salaryChanged =
    newCurrentSalary !== null &&
    previousSalary !== null &&
    newCurrentSalary !== previousSalary;

  const changePercent =
    salaryChanged && previousSalary
      ? Math.round(
          ((newCurrentSalary! - previousSalary) / previousSalary) * 1000
        ) / 10
      : null;

  const { error: upsertError } = await supabase
    .from("pro_rider_seasons")
    .upsert(
      {
        rider_id: riderId,
        season,
        manufacturer,
        sx_classification: sxClassification,
        mx_classification: mxClassification,
        smx_classification: smxClassification,
        salary_category: salaryCategory,
        starting_salary: startingSalary,
        current_salary: newCurrentSalary,
        previous_salary: salaryChanged ? previousSalary : existingRow ? previousSalary : null,
        salary_change_percent: changePercent,
        salary_updated_at: salaryChanged ? new Date().toISOString() : undefined,
        sx_active: sxActive,
        mx_active: mxActive,
        smx_active: smxActive,
        injury_status: injuryStatus,
        injury_transfer_eligible: injuryTransferEligible,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "rider_id,season" }
    );

  if (upsertError) {
    console.error("Save Pro rider season error:", upsertError);
    throw new Error(upsertError.message);
  }

  // Update the general pro_eligible flag on the rider's master record.
  const { error: riderUpdateError } = await supabase
    .from("riders")
    .update({ pro_eligible: proEligible })
    .eq("id", riderId);

  if (riderUpdateError) {
    console.error("Rider pro_eligible update error:", riderUpdateError);
    throw new Error(riderUpdateError.message);
  }

  // Log the salary change to the permanent audit history, if one
  // genuinely occurred.
  if (salaryChanged) {
    const { error: historyError } = await supabase
      .from("pro_salary_history")
      .insert({
        rider_id: riderId,
        season,
        old_salary: previousSalary,
        new_salary: newCurrentSalary,
        change_percent: changePercent,
        changed_by: userId,
      });

    if (historyError) {
      console.error("Salary history logging error:", historyError);
      // Don't block the save over a history-logging failure — the
      // primary save already succeeded above.
    }
  }

  revalidatePath("/admin/pro-riders");
  revalidatePath(`/admin/pro-riders/${riderId}`);

  redirect(`/admin/pro-riders?season=${season}&saved=true`);
}