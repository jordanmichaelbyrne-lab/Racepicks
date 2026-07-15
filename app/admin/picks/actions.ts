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

function revalidatePicksPages() {
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/picks");
  revalidatePath("/admin");
  revalidatePath("/admin/picks");
}

export async function openPicks(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  /*
   * Only one event should be open at a time.
   * Any other open event is returned to upcoming.
   */
  const { error: closeOtherEventsError } = await supabase
    .from("events")
    .update({
      status: "upcoming",
    })
    .eq("status", "open")
    .neq("id", eventId);

  if (closeOtherEventsError) {
    throw new Error(closeOtherEventsError.message);
  }

  const { error: updateError } = await supabase
    .from("events")
    .update({
      status: "open",
    })
    .eq("id", eventId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePicksPages();

  redirect(`/admin/picks?event=${eventId}&opened=true`);
}

export async function closePicks(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  const { error: updateError } = await supabase
    .from("events")
    .update({
      status: "closed",
    })
    .eq("id", eventId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePicksPages();

  redirect(`/admin/picks?event=${eventId}&closed=true`);
}

export async function reopenPicksForFiveMinutes(
  formData: FormData
) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  const newCloseTime = new Date(
    Date.now() + 5 * 60 * 1000
  ).toISOString();

  const { error: closeOtherEventsError } = await supabase
    .from("events")
    .update({
      status: "upcoming",
    })
    .eq("status", "open")
    .neq("id", eventId);

  if (closeOtherEventsError) {
    throw new Error(closeOtherEventsError.message);
  }

  const { error: updateError } = await supabase
    .from("events")
    .update({
      status: "open",
      picks_close_at: newCloseTime,
    })
    .eq("id", eventId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePicksPages();

  redirect(
    `/admin/picks?event=${eventId}&reopened=true`
  );
}