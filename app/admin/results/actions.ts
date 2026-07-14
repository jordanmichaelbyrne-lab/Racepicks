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
  const firstRiderId = String(
    formData.get("first_rider_id") ?? ""
  ).trim();
  const secondRiderId = String(
    formData.get("second_rider_id") ?? ""
  ).trim();
  const thirdRiderId = String(
    formData.get("third_rider_id") ?? ""
  ).trim();
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

  const { data: confirmedEntries, error: entriesError } =
    await supabase
      .from("event_entries")
      .select("rider_id")
      .eq("event_id", eventId)
      .eq("confirmed", true)
      .in("rider_id", selectedRiders);

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const confirmedRiderIds = new Set(
    (confirmedEntries ?? []).map((entry) => entry.rider_id)
  );

  if (
    !selectedRiders.every((riderId) =>
      confirmedRiderIds.has(riderId)
    )
  ) {
    throw new Error(
      "One or more selected riders are not on the confirmed entry list."
    );
  }

  const { error: saveError } = await supabase.from("results").upsert(
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

  if (saveError) {
    console.error("Save results error:", saveError);
    throw new Error(saveError.message);
  }

  revalidatePath("/admin/results");
  revalidatePath("/results");

  redirect(`/admin/results?event=${eventId}&saved=true`);
}

export async function scoreEvent(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, points_multiplier")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    throw new Error(
      eventError?.message ?? "The selected event was not found."
    );
  }

  const multiplier = Number(event.points_multiplier ?? 1);

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

    throw new Error(
      "Publish the race results before scoring this round."
    );
  }

  const { data: picks, error: picksError } = await supabase
    .from("picks")
    .select(
      `
        user_id,
        first_rider_id,
        second_rider_id,
        third_rider_id,
        wildcard_rider_id
      `
    )
    .eq("event_id", eventId);

  if (picksError) {
    throw new Error(picksError.message);
  }

  if (!picks || picks.length === 0) {
    throw new Error("No saved picks were found for this event.");
  }

  const scoreRows = picks.map((pick) => {
    const firstPoints =
      pick.first_rider_id === result.first_rider_id
        ? Math.round(25 * multiplier)
        : 0;

    const secondPoints =
      pick.second_rider_id === result.second_rider_id
        ? Math.round(22 * multiplier)
        : 0;

    const thirdPoints =
      pick.third_rider_id === result.third_rider_id
        ? Math.round(20 * multiplier)
        : 0;

    const wildcardPoints =
      pick.wildcard_rider_id === result.wildcard_rider_id
        ? Math.round(25 * multiplier)
        : 0;

    return {
      user_id: pick.user_id,
      event_id: eventId,
      first_points: firstPoints,
      second_points: secondPoints,
      third_points: thirdPoints,
      wildcard_points: wildcardPoints,
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

  const { error: eventUpdateError } = await supabase
    .from("events")
    .update({
      status: "completed",
    })
    .eq("id", eventId);

  if (eventUpdateError) {
    console.error("Event completion error:", eventUpdateError);
    throw new Error(eventUpdateError.message);
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/results");
  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");
  revalidatePath("/leaderboard/[userId]", "page");

  redirect(`/admin/results?event=${eventId}&scored=true`);
}