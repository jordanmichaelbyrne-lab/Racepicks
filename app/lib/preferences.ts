"use server";

import { createClient } from "./supabase/server";

export async function markHowToPlaySeen() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ has_seen_how_to_play: true })
    .eq("id", user.id);

  if (error) {
    console.error("Could not update has_seen_how_to_play:", error);
    return { success: false };
  }

  return { success: true };
}