"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return supabase;
}

export async function saveResults(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const firstRiderId = String(formData.get("first_rider_id") ?? "").trim();
  const secondRiderId = String(formData.get("second_rider_id") ?? "").trim();
  const thirdRiderId = String(formData.get("third_rider_id") ?? "").trim();
  const wildcardRiderId = String(
    formData.get("wildcard_rider_id") ?? ""
  ).trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  if (
    !firstRiderId ||
    !secondRiderId ||
    !thirdRiderId ||
    !wildcardRiderId
  ) {
    throw new Error("Please select all four result positions.");
  }

  const selectedRiders = [
    firstRiderId,
    secondRiderId,
    thirdRiderId,
    wildcardRiderId,
  ];

  if (new Set(selectedRiders).size !== selectedRiders.length) {
    throw new Error("Each rider can only be used once.");
  }

  const { error } = await supabase.from("results").upsert(
    {
      event_id: eventId,
      first_rider_id: firstRiderId,
      second_rider_id: secondRiderId,
      third_rider_id: thirdRiderId,
      wildcard_rider_id: wildcardRiderId,
      entered_at: new Date().toISOString(),
    },
    {
      onConflict: "event_id",
    }
  );

  if (error) {
    console.error("Save results error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");

  redirect(`/admin/results?event=${eventId}&saved=true`);
}