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

export type AcceptResult = { success: boolean; error?: string };

export async function acceptSuggestedSalary(
  riderId: string,
  season: number,
  newSalary: number
): Promise<AcceptResult> {
  const { supabase, userId } = await requireAdmin();

  const { data: existingRow, error: fetchError } = await supabase
    .from("pro_rider_seasons")
    .select("current_salary")
    .eq("rider_id", riderId)
    .eq("season", season)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const previousSalary = existingRow?.current_salary ?? null;
  const changePercent =
    previousSalary && previousSalary !== 0
      ? Math.round(((newSalary - previousSalary) / previousSalary) * 1000) / 10
      : null;

  const { error: updateError } = await supabase
    .from("pro_rider_seasons")
    .update({
      current_salary: newSalary,
      previous_salary: previousSalary,
      salary_change_percent: changePercent,
      salary_updated_at: new Date().toISOString(),
      suggested_salary: null,
      updated_at: new Date().toISOString(),
    })
    .eq("rider_id", riderId)
    .eq("season", season);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (previousSalary !== null && previousSalary !== newSalary) {
    await supabase.from("pro_salary_history").insert({
      rider_id: riderId,
      season,
      old_salary: previousSalary,
      new_salary: newSalary,
      change_percent: changePercent,
      changed_by: userId,
    });
  }

  revalidatePath("/admin/pro-riders");
  revalidatePath("/admin/pro-riders/monday-review");

  return { success: true };
}

export async function rejectSuggestedSalary(
  riderId: string,
  season: number
): Promise<AcceptResult> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("pro_rider_seasons")
    .update({ suggested_salary: null, updated_at: new Date().toISOString() })
    .eq("rider_id", riderId)
    .eq("season", season);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/pro-riders/monday-review");

  return { success: true };
}

export async function setSuggestedSalary(
  riderId: string,
  season: number,
  suggestedSalary: number
): Promise<AcceptResult> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("pro_rider_seasons")
    .update({
      suggested_salary: suggestedSalary,
      updated_at: new Date().toISOString(),
    })
    .eq("rider_id", riderId)
    .eq("season", season);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/pro-riders/monday-review");

  return { success: true };
}