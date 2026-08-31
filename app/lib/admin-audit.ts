import { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Writes one row to admin_audit_log. Call this from any admin server
 * action, right after the real mutation succeeds — never before, so a
 * failed action never gets logged as if it happened.
 *
 * Deliberately never throws: an audit-log write failing should never
 * block or roll back the actual admin action it's describing. Any
 * failure here is only logged to the server console.
 */
export async function logAdminAction(
  supabase: SupabaseServerClient,
  params: {
    actionType: string;
    targetTable?: string;
    targetId?: string;
    details?: Record<string, unknown>;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error(
      "logAdminAction: no authenticated user found — skipping log write."
    );
    return;
  }

  const { error } = await supabase.from("admin_audit_log").insert({
    admin_user_id: user.id,
    admin_email: user.email ?? null,
    action_type: params.actionType,
    target_table: params.targetTable ?? null,
    target_id: params.targetId ?? null,
    details: params.details ?? null,
  });

  if (error) {
    console.error("logAdminAction: failed to write audit log:", error);
  }
}