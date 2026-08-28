import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in to delete your account.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
      );

      return NextResponse.json(
        {
          error:
            "Account deletion is not configured correctly. Please contact Racepicks support.",
        },
        {
          status: 500,
        }
      );
    }

    const adminSupabase = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Racepicks has a public leaderboard and threaded Banter discussions
    // that reference this user's picks/posts/comments — most of those
    // tables have no real foreign key to profiles, so a hard delete
    // would either cascade-wipe historical scoring data or leave
    // dangling user_id references pointing at nothing. Instead: strip
    // all personal info from the profile and rename it, but keep the
    // row so every past pick/post/team stays correctly attributed and
    // displayed under a generic name. This is the same pattern most
    // apps with public social/leaderboard features use for account
    // deletion.
    const shortId = user.id.slice(0, 8);

    const { error: anonymizeError } = await adminSupabase
      .from("profiles")
      .update({
        display_name: `Deleted User ${shortId}`,
        first_name: null,
        last_name: null,
        email: null,
        avatar_url: null,
        favourite_rider: null,
        favourite_manufacturer: null,
        pro_access: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (anonymizeError) {
      console.error("Unable to anonymize profile:", anonymizeError);

      return NextResponse.json(
        {
          error:
            "We could not delete your account. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    // Ban the auth account so it can never sign in again, and scramble
    // the email so the original address is freed up for a future
    // signup — the account is fully unusable from this point on, even
    // though the underlying row is kept for referential integrity.
    const { error: banError } =
      await adminSupabase.auth.admin.updateUserById(user.id, {
        ban_duration: "87600h", // ~10 years — effectively permanent
        email: `deleted-${user.id}@racepicks.invalid`,
      });

    if (banError) {
      console.error(
        "Unable to disable Supabase auth user:",
        banError
      );

      return NextResponse.json(
        {
          error:
            "We could not fully delete your account. Please contact Racepicks support.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Unexpected account deletion error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while deleting your account.",
      },
      {
        status: 500,
      }
    );
  }
}