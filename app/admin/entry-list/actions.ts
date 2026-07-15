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

export async function saveEventEntries(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  const riderIds = formData
    .getAll("rider_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  if (riderIds.length === 0) {
    throw new Error(
      "Select at least one rider before publishing the entry list."
    );
  }

  /*
   * Clear the previous published list for this event.
   */
  const { error: deleteError } = await supabase
    .from("event_entries")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    console.error("Clear entry list error:", deleteError);
    throw new Error(deleteError.message);
  }

  /*
   * Save the newly selected riders.
   */
  const entries = riderIds.map((riderId) => ({
    event_id: eventId,
    rider_id: riderId,
    confirmed: true,
  }));

  const { error: insertError } = await supabase
    .from("event_entries")
    .insert(entries);

  if (insertError) {
    console.error("Save entry list error:", insertError);
    throw new Error(insertError.message);
  }

  /*
   * Mark this as the provisional entry-list import.
   *
   * We preserve a final import if the event has already reached that
   * stage, so republishing cannot accidentally move it backwards.
   */
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("entry_list_stage")
    .eq("id", eventId)
    .single();

  if (eventError) {
    throw new Error(eventError.message);
  }

  const alreadyFinal = event.entry_list_stage === "final";

  const eventUpdate = alreadyFinal
    ? {
        entry_list_imported_at: new Date().toISOString(),
      }
    : {
        entry_list_stage: "provisional",
        provisional_entry_imported_at: new Date().toISOString(),
        entry_list_imported_at: new Date().toISOString(),
      };

  const { error: updateEventError } = await supabase
    .from("events")
    .update(eventUpdate)
    .eq("id", eventId);

  if (updateEventError) {
    console.error("Entry-list event status error:", updateEventError);
    throw new Error(updateEventError.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/entry-list");
  revalidatePath("/admin/results");
  revalidatePath("/account");
  revalidatePath("/picks");

  redirect(
    `/admin/entry-list?event=${eventId}&saved=true&stage=provisional`
  );
}