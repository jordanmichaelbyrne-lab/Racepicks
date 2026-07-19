"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { chooseBalancedWildcard } from "@/app/lib/wildcard";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

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
    console.error("Admin profile loading error:", profileError);
    throw new Error("Your administrator account could not be checked.");
  }

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return supabase;
}

async function calculateEventScores(
  supabase: SupabaseClient,
  eventId: string
) {
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
    throw new Error("Publish the race results before scoring this round.");
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
    console.error("Picks loading error:", picksError);
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
    .upsert(scoreRows, { onConflict: "user_id,event_id" });

  if (scoringError) {
    console.error("Scoring error:", scoringError);
    throw new Error(scoringError.message);
  }

  const { error: eventUpdateError } = await supabase
    .from("events")
    .update({ status: "completed" })
    .eq("id", eventId);

  if (eventUpdateError) {
    console.error("Event completion error:", eventUpdateError);
    throw new Error(eventUpdateError.message);
  }

  return { playersScored: scoreRows.length };
}

// NEW: finds the next round in the same series/season, copies confirmed
// riders forward, generates its wildcard, and opens picks for it.
async function rolloverToNextEvent(
  supabase: SupabaseClient,
  completedEventId: string
) {
  const { data: completedEvent, error: completedEventError } = await supabase
    .from("events")
    .select("id, series, season, round_number")
    .eq("id", completedEventId)
    .single();

  if (completedEventError || !completedEvent) {
    console.error("Rollover: could not load completed event:", completedEventError);
    return { rolledOver: false, reason: "completed event not found" };
  }

  const { data: nextEvent, error: nextEventError } = await supabase
    .from("events")
    .select("id, wildcard_locked")
    .eq("series", completedEvent.series)
    .eq("season", completedEvent.season)
    .gt("round_number", completedEvent.round_number)
    .order("round_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextEventError) {
    console.error("Rollover: error finding next event:", nextEventError);
    return { rolledOver: false, reason: "error finding next event" };
  }

  if (!nextEvent) {
    // No next round exists yet (e.g. end of season) — nothing to roll over.
    return { rolledOver: false, reason: "no next event" };
  }

  // 1. Copy confirmed riders from the completed event into the next event.
  const { data: confirmedRiders, error: confirmedRidersError } = await supabase
    .from("event_entries")
    .select("rider_id")
    .eq("event_id", completedEventId)
    .eq("confirmed", true);

  if (confirmedRidersError) {
    console.error("Rollover: error loading confirmed riders:", confirmedRidersError);
    throw new Error(confirmedRidersError.message);
  }

  if (confirmedRiders && confirmedRiders.length > 0) {
    // Clear out any existing entries for the next event first, so we don't
    // end up with duplicates if this ever runs twice.
    const { error: clearError } = await supabase
      .from("event_entries")
      .delete()
      .eq("event_id", nextEvent.id);

    if (clearError) {
      console.error("Rollover: error clearing next event entries:", clearError);
      throw new Error(clearError.message);
    }

    const newEntries = confirmedRiders.map((entry) => ({
      event_id: nextEvent.id,
      rider_id: entry.rider_id,
      confirmed: true,
    }));

    const { error: insertError } = await supabase
      .from("event_entries")
      .insert(newEntries);

    if (insertError) {
      console.error("Rollover: error copying riders forward:", insertError);
      throw new Error(insertError.message);
    }
  }

  // 2. Generate and lock the wildcard for the next event (if not already).
  if (!nextEvent.wildcard_locked) {
    const { data: historyData, error: historyError } = await supabase
      .from("events")
      .select("wildcard_position")
      .eq("season", completedEvent.season)
      .eq("series", completedEvent.series)
      .neq("id", nextEvent.id)
      .not("wildcard_position", "is", null)
      .order("round_number", { ascending: true });

    if (historyError) {
      console.error("Rollover: error loading wildcard history:", historyError);
      throw new Error(historyError.message);
    }

    const previousPositions = (historyData ?? [])
      .map((event) => event.wildcard_position)
      .filter((position): position is number => typeof position === "number");

    const wildcardPosition = chooseBalancedWildcard(previousPositions);

    const { error: wildcardUpdateError } = await supabase
      .from("events")
      .update({
        wildcard_position: wildcardPosition,
        wildcard_generated_at: new Date().toISOString(),
        wildcard_source: "automatic",
        wildcard_locked: true,
      })
      .eq("id", nextEvent.id);

    if (wildcardUpdateError) {
      console.error("Rollover: error setting wildcard:", wildcardUpdateError);
      throw new Error(wildcardUpdateError.message);
    }
  }

  // 3. Open picks for the next event.
  const { error: openError } = await supabase
    .from("events")
    .update({ status: "open" })
    .eq("id", nextEvent.id);

  if (openError) {
    console.error("Rollover: error opening next event:", openError);
    throw new Error(openError.message);
  }

  return { rolledOver: true };
}

function revalidateResultsPages() {
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/results");
  revalidatePath("/admin");
  revalidatePath("/admin/results");
  revalidatePath("/admin/wildcard");
  revalidatePath("/admin/entry-list");
  revalidatePath("/picks");
  revalidatePath("/leaderboard");
  revalidatePath("/leaderboard/[userId]", "page");
}

export async function saveResults(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const firstRiderId = String(formData.get("first_rider_id") ?? "").trim();
  const secondRiderId = String(formData.get("second_rider_id") ?? "").trim();
  const thirdRiderId = String(formData.get("third_rider_id") ?? "").trim();
  const wildcardRiderId = String(formData.get("wildcard_rider_id") ?? "").trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  if (!firstRiderId || !secondRiderId || !thirdRiderId || !wildcardRiderId) {
    throw new Error("Please select all four result positions.");
  }

  const selectedRiders = [firstRiderId, secondRiderId, thirdRiderId, wildcardRiderId];

  if (new Set(selectedRiders).size !== selectedRiders.length) {
    throw new Error("Each rider can only be used once.");
  }

  const { data: confirmedEntries, error: entriesError } = await supabase
    .from("event_entries")
    .select("rider_id")
    .eq("event_id", eventId)
    .eq("confirmed", true)
    .in("rider_id", selectedRiders);

  if (entriesError) {
    console.error("Entry-list validation error:", entriesError);
    throw new Error(entriesError.message);
  }

  const confirmedRiderIds = new Set(
    (confirmedEntries ?? []).map((entry) => entry.rider_id)
  );

  const everyRiderIsConfirmed = selectedRiders.every((riderId) =>
    confirmedRiderIds.has(riderId)
  );

  if (!everyRiderIsConfirmed) {
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
    { onConflict: "event_id" }
  );

  if (saveError) {
    console.error("Save results error:", saveError);
    throw new Error(saveError.message);
  }

  const { playersScored } = await calculateEventScores(supabase, eventId);

  // NEW: automatically roll over to the next round.
  await rolloverToNextEvent(supabase, eventId);

  revalidateResultsPages();

  redirect(
    `/admin/results?event=${eventId}&published=true&scored=true&players=${playersScored}`
  );
}

export async function scoreEvent(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  const { playersScored } = await calculateEventScores(supabase, eventId);

  revalidateResultsPages();

  redirect(
    `/admin/results?event=${eventId}&recalculated=true&players=${playersScored}`
  );
}