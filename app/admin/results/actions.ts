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
export async function scoreEvent(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  const { data: result, error: resultError } = await supabase
    .from("results")
    .select(
      `
        first_rider_id,
        second_rider_id,
        third_rider_id,
        wildcard_rider_id
      `
    )
    .eq("event_id", eventId)
    .single();

  if (resultError || !result) {
    console.error("Result loading error:", resultError);
    throw new Error("Publish the race results before scoring this round.");
  }

  const { data: picks, error: picksError } = await supabase
    .from("picks")
    .select(
      `
        user_id,
        event_id,
        first_rider_id,
        second_rider_id,
        third_rider_id,
        wildcard_rider_id
      `
    )
    .eq("event_id", eventId);

  if (picksError) {
    console.error("Pick loading error:", picksError);
    throw new Error(picksError.message);
  }

  if (!picks || picks.length === 0) {
    throw new Error(
      "No saved picks were found for this event. Check the picks table."
    );
  }

  const scoreRows = picks.map((pick) => {
    const firstPoints =
      pick.first_rider_id === result.first_rider_id ? 25 : 0;

    const secondPoints =
      pick.second_rider_id === result.second_rider_id ? 22 : 0;

    const thirdPoints =
      pick.third_rider_id === result.third_rider_id ? 20 : 0;

    const wildcardPoints =
      pick.wildcard_rider_id === result.wildcard_rider_id ? 25 : 0;

    return {
      user_id: pick.user_id,
      event_id: eventId,
      first_points: firstPoints,
      second_points: secondPoints,
      third_points: thirdPoints,
      wildcard_points: wildcardPoints,
      round_points:
        firstPoints + secondPoints + thirdPoints + wildcardPoints,
      created_at: new Date().toISOString(),
    };
  });

  const { error: scoringError } = await supabase
    .from("scores")
    .upsert(scoreRows, {
      onConflict: "user_id,event_id",
    });

  if (scoringError) {
    console.error("Scoring error:", scoringError);
    throw new Error(scoringError.message);
  }

  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");
  revalidatePath("/leaderboard/[userId]", "page");

  redirect(`/admin/results?event=${eventId}&scored=true`);
}