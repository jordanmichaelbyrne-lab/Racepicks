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

    const { error: deleteError } =
      await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Unable to delete Supabase user:", deleteError);

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