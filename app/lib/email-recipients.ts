import { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getAllPlayerEmails(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .not("email", "is", null);

  if (error) {
    console.error("Could not load player emails:", error);
    return [];
  }

  return (data ?? []).filter(
    (profile): profile is { id: string; email: string; display_name: string | null } =>
      Boolean(profile.email)
  );
}