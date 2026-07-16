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

  return {
    supabase,
    currentUserId: user.id,
  };
}

export async function updatePlayerRole(formData: FormData) {
  const { supabase, currentUserId } = await requireAdmin();

  const playerId = String(
    formData.get("player_id") ?? ""
  ).trim();

  const newRole = String(
    formData.get("role") ?? ""
  ).trim();

  if (!playerId) {
    throw new Error("Player ID is missing.");
  }

  if (!["player", "admin"].includes(newRole)) {
    throw new Error("Invalid player role.");
  }

  /*
   * Prevent the currently logged-in administrator from accidentally
   * removing their own administrator access.
   */
  if (playerId === currentUserId && newRole !== "admin") {
    redirect("/admin/players?selfRoleBlocked=true");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role: newRole,
    })
    .eq("id", playerId);

  if (error) {
    console.error("Player role update error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath("/account");

  redirect(
    `/admin/players?updated=true&player=${playerId}`
  );
}