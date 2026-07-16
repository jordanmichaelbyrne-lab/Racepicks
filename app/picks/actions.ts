"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";

type SavePicksInput = {
  eventId: string;
  firstRiderId: string;
  secondRiderId: string;
  thirdRiderId: string;
  wildcardRiderId: string;
};

type SavePicksResult = {
  success: boolean;
  message: string;
};

export async function savePicks(
  input: SavePicksInput
): Promise<SavePicksResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message:
        "Please sign in before submitting your picks.",
    };
  }

  const {
    eventId,
    firstRiderId,
    secondRiderId,
    thirdRiderId,
    wildcardRiderId,
  } = input;

  if (
    !eventId ||
    !firstRiderId ||
    !secondRiderId ||
    !thirdRiderId ||
    !wildcardRiderId
  ) {
    return {
      success: false,
      message: "Please select all four riders.",
    };
  }

  const selectedRiderIds = [
    firstRiderId,
    secondRiderId,
    thirdRiderId,
    wildcardRiderId,
  ];

  if (
    new Set(selectedRiderIds).size !==
    selectedRiderIds.length
  ) {
    return {
      success: false,
      message: "Each rider can only be selected once.",
    };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, status, picks_close_at")
      
  
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return {
      success: false,
      message: "The selected event could not be found.",
    };
  }

  if (event.status !== "open") {
    return {
      success: false,
      message: "Picks are closed for this event.",
    };
  }

  if (!event.picks_close_at) {
    return {
      success: false,
      message:
        "The pick closing time has not been configured.",
    };
  }

  const picksCloseAt = new Date(event.picks_close_at);

  if (Number.isNaN(picksCloseAt.getTime())) {
    console.error(
      "Invalid picks_close_at value:",
      event.picks_close_at
    );

    return {
      success: false,
      message: "The pick closing time is invalid.",
    };
  }

  if (Date.now() >= picksCloseAt.getTime()) {
    return {
      success: false,
      message:
        "Picks are locked for this round. The closing time has passed.",
    };
  }

  const { data: confirmedEntries, error: entriesError } =
    await supabase
      .from("event_entries")
      .select("rider_id")
      .eq("event_id", eventId)
      .eq("confirmed", true)
      .in("rider_id", selectedRiderIds);

  if (entriesError) {
    console.error(
      "Entry-list validation error:",
      entriesError
    );

    return {
      success: false,
      message: "The entry list could not be checked.",
    };
  }

  const confirmedRiderIds = new Set(
    (confirmedEntries ?? []).map(
      (entry) => entry.rider_id
    )
  );

  const selectionsAreValid = selectedRiderIds.every(
    (riderId) => confirmedRiderIds.has(riderId)
  );

  if (!selectionsAreValid) {
    return {
      success: false,
      message:
        "One or more selected riders are no longer lining up. Please update your picks.",
    };
  }


  const { error: saveError } = await supabase
    .from("picks")
    .upsert(
      {
        user_id: user.id,
        event_id: eventId,
        first_rider_id: firstRiderId,
        second_rider_id: secondRiderId,
        third_rider_id: thirdRiderId,
        wildcard_rider_id: wildcardRiderId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,event_id",
      }
    );

  if (saveError) {
    console.error("Pick saving error:", saveError);

    return {
      success: false,
      message: `Your picks could not be saved: ${saveError.message}`,
    };
  }

  revalidatePath("/");
  revalidatePath("/picks");
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/picks");

  return {
    success: true,
    message:
      "You’re on the gate! Your picks have been saved.",
  };
}