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

  const { error: deleteError } = await supabase
    .from("event_entries")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    console.error("Clear entry list error:", deleteError);
    throw new Error(deleteError.message);
  }

  if (riderIds.length > 0) {
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
  }

  revalidatePath("/admin/entry-list");
  revalidatePath("/picks");

  redirect(`/admin/entry-list?event=${eventId}&saved=true`);
}