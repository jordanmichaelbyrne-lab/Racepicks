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

// Maps loosely-formatted category text (spaces, extra words, mixed case —
// e.g. what you'd naturally type in Excel) onto the exact snake_case
// values the database actually requires. Falls back to null rather than
// silently saving something the database would reject outright.
const SALARY_CATEGORY_MAP: Record<string, string> = {
  "championship favourite": "championship_favourite",
  "championship favorite": "championship_favourite",
  elite: "elite",
  "podium threat": "podium_threat",
  "strong factory": "strong_factory",
  "mid factory elite challenger": "mid_factory_elite_challenger",
  "mid factory / elite challenger": "mid_factory_elite_challenger",
  "strong challenger": "strong_challenger",
  "mid challenger": "mid_challenger",
  "lower field occasional": "lower_field_occasional",
  "lower field occasional racer": "lower_field_occasional",
  "lower field / occasional": "lower_field_occasional",
};

function normalizeSalaryCategory(value: string | undefined): string | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;

  const validValues = new Set(Object.values(SALARY_CATEGORY_MAP));

  // Already in the correct snake_case format.
  if (validValues.has(raw)) return raw;

  // Try direct match against space-formatted keys.
  if (SALARY_CATEGORY_MAP[raw]) return SALARY_CATEGORY_MAP[raw];

  // Handle underscore-formatted variants (e.g. a bulk pre-fill that used
  // "lower_field_occasional_racer" instead of spaces) by converting
  // underscores to spaces and trying again.
  const spaceVersion = raw.replace(/_/g, " ");
  if (SALARY_CATEGORY_MAP[spaceVersion]) return SALARY_CATEGORY_MAP[spaceVersion];

  return null;
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
    const rawSalaryCategory = col(row, "salary_category")?.trim();
    const salaryCategory = normalizeSalaryCategory(rawSalaryCategory);

    if (rawSalaryCategory && !salaryCategory) {
      errors.push(
        `${col(row, "rider_name") ?? riderId}: couldn't match salary_category "${rawSalaryCategory}" — saved without a category, please fix and re-import.`
      );
    }
    const startingSalary = numOrNull(col(row, "starting_salary"));
    // At initial setup, current_salary should default to starting_salary —
    // there's no price history yet to make them differ. Only a genuine
    // Monday adjustment later should create a gap between the two.
    const currentSalary = numOrNull(col(row, "current_salary")) ?? startingSalary;
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