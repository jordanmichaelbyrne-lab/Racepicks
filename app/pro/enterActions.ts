"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { PRO_FREE_FOR_SEASON } from "@/app/pro/lib/proConfig";

// One-click entry while Pro is free. Uses the admin client because
// pro_access is a protected flag players can't normally set on
// themselves. Only ever sets it for the logged-in user.
export async function enterPro() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!PRO_FREE_FOR_SEASON) {
    redirect("/pro");
  }

  const admin = await createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ pro_access: true })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/pro");
  redirect("/pro/team");
}