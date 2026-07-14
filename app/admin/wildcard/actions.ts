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

function chooseBalancedWildcard(previousPositions: number[]) {
  const possiblePositions = Array.from(
    { length: 9 },
    (_, index) => index + 7
  );

  const usageCounts = new Map<number, number>();

  possiblePositions.forEach((position) => {
    usageCounts.set(position, 0);
  });

  previousPositions.forEach((position) => {
    usageCounts.set(
      position,
      (usageCounts.get(position) ?? 0) + 1
    );
  });

  const recentPositions = new Set(previousPositions.slice(0, 2));

  let availablePositions = possiblePositions.filter(
    (position) => !recentPositions.has(position)
  );

  if (availablePositions.length === 0) {
    availablePositions = possiblePositions;
  }

  const lowestUsage = Math.min(
    ...availablePositions.map(
      (position) => usageCounts.get(position) ?? 0
    )
  );

  const bestCandidates = availablePositions.filter(
    (position) =>
      (usageCounts.get(position) ?? 0) === lowestUsage
  );

  return bestCandidates[
    Math.floor(Math.random() * bestCandidates.length)
  ];
}

export async function generateWildcard(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const forceRegenerate =
    String(formData.get("force_regenerate")) === "true";

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  const { data: selectedEvent, error: eventError } = await supabase
    .from("events")
    .select(
      `
        id,
        season,
        series,
        round_number,
        wildcard_position
      `
    )
    .eq("id", eventId)
    .single();

  if (eventError || !selectedEvent) {
    throw new Error(
      eventError?.message ?? "The selected event was not found."
    );
  }

  if (
    selectedEvent.wildcard_position &&
    !forceRegenerate
  ) {
    redirect(
      `/admin/wildcard?event=${eventId}&alreadyGenerated=true`
    );
  }

  const { data: previousEvents, error: historyError } =
    await supabase
      .from("events")
      .select("round_number, wildcard_position")
      .eq("season", selectedEvent.season)
      .eq("series", selectedEvent.series)
      .not("wildcard_position", "is", null)
      .neq("id", eventId)
      .order("round_number", { ascending: false });

  if (historyError) {
    throw new Error(historyError.message);
  }

  const previousPositions = (previousEvents ?? [])
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
      wildcard_source: forceRegenerate
        ? "admin_regenerated"
        : "automatic",
    })
    .eq("id", eventId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/admin/wildcard");
  revalidatePath("/picks");
  revalidatePath("/account");
  revalidatePath("/");

  redirect(
    `/admin/wildcard?event=${eventId}&generated=${wildcardPosition}`
  );
}