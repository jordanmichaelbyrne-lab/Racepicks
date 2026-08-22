import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client — this BYPASSES Row Level Security
// entirely, so it can see every row in every table regardless of who
// (if anyone) is logged in.
//
// Only use this in trusted, server-only code that never runs on behalf
// of a specific logged-in visitor — e.g. cron jobs authenticated via
// CRON_SECRET. Never import this into anything that runs in the browser,
// and never use it for a request initiated by an ordinary player — for
// that, use the regular cookie-based client in ./server.ts instead, so
// normal RLS privacy rules (like "you can only see your own picks")
// still apply.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}