"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    redirect("/");
  }

  return supabase;
}

function buildErrorRedirect(
  message: string,
  extra?: { conflictRiderId?: string; conflictRiderName?: string }
): never {
  const params = new URLSearchParams({ error: message });

  if (extra?.conflictRiderId) {
    params.set("conflictRiderId", extra.conflictRiderId);
  }

  if (extra?.conflictRiderName) {
    params.set("conflictRiderName", extra.conflictRiderName);
  }

  redirect(`/admin/riders?${params.toString()}`);
}

// Race numbers only need to be unique among ACTIVE riders within the
// same class. A disabled rider (e.g. lost their licence, didn't renew)
// frees their number up automatically — no separate "release number"
// step needed, disabling them is enough.
async function findActiveNumberClash(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raceNumber: number,
  className: string,
  excludeRiderId?: string
) {
  let query = supabase
    .from("riders")
    .select("id, full_name")
    .eq("race_number", raceNumber)
    .eq("class_name", className)
    .eq("is_active", true);

  if (excludeRiderId) {
    query = query.neq("id", excludeRiderId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Race number clash check error:", error);
    return null;
  }

  return data;
}

export async function addRider(formData: FormData) {
  const supabase = await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const raceNumberValue = String(formData.get("race_number") ?? "").trim();
  const teamName = String(formData.get("team_name") ?? "").trim();
  const manufacturer = String(formData.get("manufacturer") ?? "").trim();
  const nationality = String(formData.get("nationality") ?? "").trim();
  const className = String(formData.get("class_name") ?? "450").trim();
  const racerxSlug = String(formData.get("racerx_slug") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();

  if (!fullName) {
    buildErrorRedirect("Rider name is required.");
  }

  const raceNumber =
    raceNumberValue === "" ? null : Number.parseInt(raceNumberValue, 10);

  if (
    raceNumberValue !== "" &&
    (raceNumber === null || !Number.isInteger(raceNumber) || raceNumber < 0)
  ) {
    buildErrorRedirect("Race number must be a valid number.");
  }

  if (raceNumber !== null) {
    const clash = await findActiveNumberClash(supabase, raceNumber, className);

    if (clash) {
      buildErrorRedirect(
        `#${raceNumber} (${className}) is already in use by an active rider: ${clash.full_name}. Disable or renumber them first, then try again.`,
        { conflictRiderId: clash.id, conflictRiderName: clash.full_name }
      );
    }
  }

  const { error } = await supabase.from("riders").insert({
    full_name: fullName,
    race_number: raceNumber,
    team_name: teamName || null,
    manufacturer: manufacturer || null,
    nationality: nationality || null,
    class_name: className,
    racerx_slug: racerxSlug || null,
    image_url: imageUrl || null,
    is_active: true,
  });

  if (error) {
    console.error("Add rider error:", error);
    buildErrorRedirect(error.message);
  }

  revalidatePath("/admin/riders");
  revalidatePath("/picks");

  redirect(`/admin/riders?added=${encodeURIComponent(fullName)}`);
}

export async function toggleRiderStatus(formData: FormData) {
  const supabase = await requireAdmin();

  const riderId = String(formData.get("rider_id") ?? "").trim();
  const currentStatus = String(formData.get("current_status")) === "true";

  if (!riderId) {
    throw new Error("Rider ID is missing.");
  }

  const { error } = await supabase
    .from("riders")
    .update({
      is_active: !currentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", riderId);

  if (error) {
    console.error("Toggle rider error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/riders");
  revalidatePath("/picks");
}

export async function updateRider(formData: FormData) {
  const supabase = await requireAdmin();

  const riderId = String(formData.get("rider_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const raceNumberValue = String(formData.get("race_number") ?? "").trim();
  const teamName = String(formData.get("team_name") ?? "").trim();
  const manufacturer = String(formData.get("manufacturer") ?? "").trim();
  const nationality = String(formData.get("nationality") ?? "").trim();
  const className = String(formData.get("class_name") ?? "450").trim();
  const racerxSlug = String(formData.get("racerx_slug") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();

  if (!riderId) {
    throw new Error("Rider ID is missing.");
  }

  if (!fullName) {
    buildErrorRedirect("Rider name is required.");
  }

  const raceNumber =
    raceNumberValue === "" ? null : Number.parseInt(raceNumberValue, 10);

  if (
    raceNumberValue !== "" &&
    (raceNumber === null || !Number.isInteger(raceNumber) || raceNumber < 0)
  ) {
    buildErrorRedirect("Race number must be a valid number.");
  }

  if (raceNumber !== null) {
    const clash = await findActiveNumberClash(
      supabase,
      raceNumber,
      className,
      riderId
    );

    if (clash) {
      buildErrorRedirect(
        `#${raceNumber} (${className}) is already in use by an active rider: ${clash.full_name}. Disable or renumber them first, then try again.`,
        { conflictRiderId: clash.id, conflictRiderName: clash.full_name }
      );
    }
  }

  const { error } = await supabase
    .from("riders")
    .update({
      full_name: fullName,
      race_number: raceNumber,
      team_name: teamName || null,
      manufacturer: manufacturer || null,
      nationality: nationality || null,
      class_name: className,
      racerx_slug: racerxSlug || null,
      image_url: imageUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", riderId);

  if (error) {
    console.error("Update rider error:", error);
    buildErrorRedirect(error.message);
  }

  revalidatePath("/admin/riders");
  revalidatePath(`/admin/riders/${riderId}`);
  revalidatePath("/picks");

  redirect(`/admin/riders?updated=${encodeURIComponent(fullName)}`);
}