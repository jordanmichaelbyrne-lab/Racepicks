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

function parseCsv(text: string): string[][] {
  // Simple CSV parser that handles quoted fields with embedded commas.
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function boolFromCsv(value: string | undefined, fallback = true): boolean {
  if (value === undefined || value === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

function numOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function classificationOrNull(value: string | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return v === "factory" || v === "challenger" ? v : null;
}

export async function importProRidersCsv(formData: FormData) {
  const { supabase, userId } = await requireAdmin();

  const season = Number.parseInt(String(formData.get("season") ?? ""), 10);
  const file = formData.get("csv_file") as File | null;

  if (!season || !file) {
    throw new Error("Season and CSV file are required.");
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    throw new Error("CSV file appears to be empty.");
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  function col(row: string[], name: string): string | undefined {
    const idx = headers.indexOf(name);
    return idx === -1 ? undefined : row[idx];
  }

  let updatedCount = 0;
  let salaryChangesLogged = 0;
  const errors: string[] = [];

  // Fetch existing salaries up front, so we can detect real changes for history logging.
  const { data: existingRows } = await supabase
    .from("pro_rider_seasons")
    .select("rider_id, current_salary")
    .eq("season", season);

  const existingSalaryByRiderId = new Map(
    (existingRows ?? []).map((r) => [r.rider_id, r.current_salary])
  );

  for (const row of dataRows) {
    const riderId = col(row, "rider_id")?.trim();

    if (!riderId) {
      continue;
    }

    const proEligible = boolFromCsv(col(row, "pro_eligible"), false);
    const manufacturer = col(row, "pro_manufacturer")?.trim() || null;
    const sxClassification = classificationOrNull(col(row, "sx_classification"));
    const mxClassification = classificationOrNull(col(row, "mx_classification"));
    const smxClassification = classificationOrNull(col(row, "smx_classification"));
    const salaryCategory = col(row, "salary_category")?.trim() || null;
    const startingSalary = numOrNull(col(row, "starting_salary"));
    const currentSalary = numOrNull(col(row, "current_salary"));
    const sxActive = boolFromCsv(col(row, "sx_active"));
    const mxActive = boolFromCsv(col(row, "mx_active"));
    const smxActive = boolFromCsv(col(row, "smx_active"));
    const injuryStatus = col(row, "injury_status")?.trim() || "healthy";
    const adminNotes = col(row, "admin_notes")?.trim() || null;

    const previousSalary = existingSalaryByRiderId.get(riderId) ?? null;
    const salaryChanged =
      currentSalary !== null &&
      previousSalary !== null &&
      currentSalary !== previousSalary;

    const changePercent =
      salaryChanged && previousSalary
        ? Math.round(((currentSalary! - previousSalary) / previousSalary) * 1000) / 10
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
          current_salary: currentSalary,
          previous_salary: salaryChanged ? previousSalary : undefined,
          salary_change_percent: changePercent,
          salary_updated_at: salaryChanged ? new Date().toISOString() : undefined,
          sx_active: sxActive,
          mx_active: mxActive,
          smx_active: smxActive,
          injury_status: injuryStatus,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "rider_id,season" }
      );

    if (upsertError) {
      errors.push(`${col(row, "rider_name") ?? riderId}: ${upsertError.message}`);
      continue;
    }

    const { error: riderUpdateError } = await supabase
      .from("riders")
      .update({ pro_eligible: proEligible })
      .eq("id", riderId);

    if (riderUpdateError) {
      errors.push(`${col(row, "rider_name") ?? riderId} (pro_eligible): ${riderUpdateError.message}`);
    }

    if (salaryChanged) {
      const { error: historyError } = await supabase
        .from("pro_salary_history")
        .insert({
          rider_id: riderId,
          season,
          old_salary: previousSalary,
          new_salary: currentSalary,
          change_percent: changePercent,
          changed_by: userId,
        });

      if (!historyError) {
        salaryChangesLogged += 1;
      }
    }

    updatedCount += 1;
  }

  revalidatePath("/admin/pro-riders");

  const errorParam = errors.length > 0
    ? `&errors=${encodeURIComponent(errors.slice(0, 5).join(" | "))}`
    : "";

  redirect(
    `/admin/pro-riders?season=${season}&imported=${updatedCount}&salaryChanges=${salaryChangesLogged}${errorParam}`
  );
}