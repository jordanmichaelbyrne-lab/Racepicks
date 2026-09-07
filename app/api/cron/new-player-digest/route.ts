import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { wrapEmailHtml, standardEmailHeaders } from "@/app/lib/email-template";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_TYPE = "new_player_digest";

async function logRun(
  supabase: ReturnType<typeof createAdminClient>,
  status: string,
  message: string,
  extra?: { recipientsCount?: number; failedCount?: number }
) {
  const { error } = await supabase.from("scheduled_email_log").insert({
    email_type: EMAIL_TYPE,
    status,
    recipients_count: extra?.recipientsCount ?? null,
    failed_count: extra?.failedCount ?? null,
    message,
  });

  if (error) {
    console.error("New player digest: failed to write log row:", error);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  // Service-role client — same reasoning as the reminder cron routes:
  // this is a trusted, no-user-session backend job, so it needs to
  // bypass RLS to reliably see every new signup, not just whichever
  // rows an anonymous request happens to be allowed to see.
  const supabase = createAdminClient();

  if (!adminEmail) {
    console.error(
      "New player digest: ADMIN_NOTIFICATION_EMAIL is not set — nothing to send to."
    );
    await logRun(supabase, "error", "ADMIN_NOTIFICATION_EMAIL is not configured.");
    return NextResponse.json(
      { error: "ADMIN_NOTIFICATION_EMAIL is not configured." },
      { status: 500 }
    );
  }

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: newPlayers, error: newPlayersError } = await supabase
    .from("profiles")
    .select("display_name, email, created_at")
    .gte("created_at", twentyFourHoursAgo)
    .order("created_at", { ascending: true });

  if (newPlayersError) {
    console.error("New player digest: query error:", newPlayersError);
    await logRun(supabase, "error", newPlayersError.message);
    return NextResponse.json(
      { error: newPlayersError.message },
      { status: 500 }
    );
  }

  if (!newPlayers || newPlayers.length === 0) {
    await logRun(supabase, "skipped", "No new players in the last 24 hours — nothing to send.");
    return NextResponse.json({
      message: "No new players in the last 24 hours — nothing to send.",
    });
  }

  const playerRowsHtml = newPlayers
    .map((player) => {
      const joinedLabel = new Intl.DateTimeFormat("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Australia/Brisbane",
      }).format(new Date(player.created_at));

      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">
            <strong>${player.display_name ?? "Unnamed Player"}</strong><br/>
            <span style="color:#888888;font-size:13px;">${player.email ?? "No email"}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eeeeee;text-align:right;color:#888888;font-size:13px;">
            ${joinedLabel}
          </td>
        </tr>
      `;
    })
    .join("");

  const bodyHtml = `
    <p>Hi Jordan,</p>
    <p>
      <strong>${newPlayers.length}</strong> new player${
    newPlayers.length === 1 ? "" : "s"
  } joined Racepicks in the last 24 hours:
    </p>
    <table role="presentation" width="100%" style="margin:16px 0;border-collapse:collapse;">
      ${playerRowsHtml}
    </table>
  `;

  try {
    const result = await resend.emails.send({
      from: "Racepicks <notifications@racepicks.app>",
      to: adminEmail,
      subject: `${newPlayers.length} new player${
        newPlayers.length === 1 ? "" : "s"
      } joined Racepicks`,
      html: wrapEmailHtml({
        bodyHtml,
        ctaText: "View All Players",
        ctaHref: "https://racepicks.app/admin/players",
        preheaderText: `${newPlayers.length} new signup${
          newPlayers.length === 1 ? "" : "s"
        } in the last 24 hours`,
      }),
      headers: standardEmailHeaders,
    });

    if (result.error) {
      console.error("New player digest: Resend API error:", result.error);
      await logRun(supabase, "error", "Failed to send digest email.");
      return NextResponse.json(
        { error: "Failed to send digest email." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("New player digest: failed to send:", err);
    await logRun(supabase, "error", "Failed to send digest email.");
    return NextResponse.json(
      { error: "Failed to send digest email." },
      { status: 500 }
    );
  }

  const message = `Digest sent — ${newPlayers.length} new player(s) in the last 24 hours.`;

  await logRun(supabase, "sent", message, {
    recipientsCount: 1,
    failedCount: 0,
  });

  return NextResponse.json({ message });
}