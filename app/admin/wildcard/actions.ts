"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { chooseBalancedWildcard } from "@/app/lib/wildcard";

type WildcardEvent = {
  id: string;
  season: number;
  series: string;
  round_number: number;
  wildcard_position: number | null;
  wildcard_locked: boolean | null;
};

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

  return supabase;
}

function revalidateWildcardPages() {
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/picks");
  revalidatePath("/results");
  revalidatePath("/admin");
  revalidatePath("/admin/results");
  revalidatePath("/admin/wildcard");
}

export async function generateWildcard(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  const { data, error: eventError } = await supabase
    .from("events")
    .select(
      `
        id,
        season,
        series,
        round_number,
        wildcard_position,
        wildcard_locked
      `
    )
    .eq("id", eventId)
    .single();

  if (eventError || !data) {
    throw new Error(
      eventError?.message ?? "The selected event was not found."
    );
  }

  const selectedEvent = data as WildcardEvent;

  if (
    selectedEvent.wildcard_locked === true &&
    typeof selectedEvent.wildcard_position === "number"
  ) {
    redirect(`/admin/wildcard?event=${eventId}&locked=true`);
  }

  const { data: historyData, error: historyError } = await supabase
    .from("events")
    .select("round_number, wildcard_position")
    .eq("season", selectedEvent.season)
    .eq("series", selectedEvent.series)
    .neq("id", selectedEvent.id)
    .not("wildcard_position", "is", null)
    .order("round_number", { ascending: true });

  if (historyError) {
    throw new Error(historyError.message);
  }

  const previousPositions = (historyData ?? [])
    .map((event) => event.wildcard_position)
    .filter(
      (position): position is number =>
        typeof position === "number"
    );

  const wildcardPosition =
    chooseBalancedWildcard(previousPositions);

  const { error: updateError } = await supabase
    .from("events")
    .update({
      wildcard_position: wildcardPosition,
      wildcard_generated_at: new Date().toISOString(),
      wildcard_source: "automatic",
      wildcard_locked: true,
    })
    .eq("id", eventId);

  if (updateError) {
    console.error("Wildcard update error:", updateError);
    throw new Error(updateError.message);
  }

  const { data: verifiedEvent, error: verificationError } =
    await supabase
      .from("events")
      .select("wildcard_position, wildcard_locked")
      .eq("id", eventId)
      .single();

  if (verificationError) {
    throw new Error(verificationError.message);
  }

  if (
    verifiedEvent?.wildcard_position !== wildcardPosition ||
    verifiedEvent?.wildcard_locked !== true
  ) {
    throw new Error(
      "The wildcard was generated but could not be saved and locked."
    );
  }

  revalidateWildcardPages();

  redirect(
    `/admin/wildcard?event=${eventId}&generated=${wildcardPosition}`
  );
}

export async function generateAllWildcards(formData: FormData) {
  const supabase = await requireAdmin();

  const season = Number(formData.get("season"));

  if (!Number.isInteger(season)) {
    throw new Error("A valid season is required.");
  }

  const { data, error: eventsError } = await supabase
    .from("events")
    .select(
      `
        id,
        season,
        series,
        round_number,
        wildcard_position,
        wildcard_locked
      `
    )
    .eq("season", season)
    .order("series", { ascending: true })
    .order("round_number", { ascending: true });

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const events = (data ?? []) as WildcardEvent[];

  if (events.length === 0) {
    throw new Error(`No events were found for ${season}.`);
  }

  const unlockedEvents = events.filter(
    (event) =>
      event.wildcard_locked !== true ||
      typeof event.wildcard_position !== "number"
  );

  if (unlockedEvents.length === 0) {
    revalidateWildcardPages();

    redirect(
      `/admin/wildcard?season=${season}&alreadyLocked=true`
    );
  }

  const seriesNames = Array.from(
    new Set(events.map((event) => event.series))
  );

  const updates: Array<{
    id: string;
    wildcardPosition: number;
  }> = [];

  for (const series of seriesNames) {
    const seriesEvents = events
      .filter((event) => event.series === series)
      .sort(
        (firstEvent, secondEvent) =>
          firstEvent.round_number - secondEvent.round_number
      );

    const assignedPositions: number[] = [];

    for (const event of seriesEvents) {
      if (
        event.wildcard_locked === true &&
        typeof event.wildcard_position === "number"
      ) {
        assignedPositions.push(event.wildcard_position);
        continue;
      }

      const wildcardPosition =
        chooseBalancedWildcard(assignedPositions);

      assignedPositions.push(wildcardPosition);

      updates.push({
        id: event.id,
        wildcardPosition,
      });
    }
  }

  const generatedAt = new Date().toISOString();

  for (const eventUpdate of updates) {
    const { error: updateError } = await supabase
      .from("events")
      .update({
        wildcard_position: eventUpdate.wildcardPosition,
        wildcard_generated_at: generatedAt,
        wildcard_source: "automatic",
        wildcard_locked: true,
      })
      .eq("id", eventUpdate.id);

    if (updateError) {
      console.error(
        `Wildcard update failed for event ${eventUpdate.id}:`,
        updateError
      );

      throw new Error(updateError.message);
    }
  }

  const { data: verificationData, error: verificationError } =
    await supabase
      .from("events")
      .select("id, wildcard_position, wildcard_locked")
      .eq("season", season);

  if (verificationError) {
    throw new Error(verificationError.message);
  }

  const verifiedEvents = verificationData ?? [];

  const incompleteEvents = verifiedEvents.filter(
    (event) =>
      typeof event.wildcard_position !== "number" ||
      event.wildcard_locked !== true
  );

  if (incompleteEvents.length > 0) {
    throw new Error(
      `${incompleteEvents.length} event wildcards could not be verified.`
    );
  }

  revalidateWildcardPages();

  redirect(
    `/admin/wildcard?season=${season}&batchGenerated=${updates.length}`
  );
}

export async function resetSeasonWildcards(formData: FormData) {
  const supabase = await requireAdmin();

  const season = Number(formData.get("season"));
  const confirmed =
    String(formData.get("confirm_reset") ?? "") === "confirmed";

  if (!Number.isInteger(season)) {
    throw new Error("A valid season is required.");
  }

  if (!confirmed) {
    throw new Error(
      "You must confirm that you want to reset the season wildcards."
    );
  }

  const { error: resetError } = await supabase
    .from("events")
    .update({
      wildcard_position: null,
      wildcard_generated_at: null,
      wildcard_source: null,
      wildcard_locked: false,
    })
    .eq("season", season);

  if (resetError) {
    console.error("Season wildcard reset error:", resetError);
    throw new Error(resetError.message);
  }

  const { count: resetCount, error: countError } = await supabase
    .from("events")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("season", season)
    .is("wildcard_position", null)
    .eq("wildcard_locked", false);

  if (countError) {
    throw new Error(countError.message);
  }

  revalidateWildcardPages();

  redirect(
    `/admin/wildcard?season=${season}&reset=${resetCount ?? 0}`
  );
}