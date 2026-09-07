import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getAllPlayerEmails } from "@/app/lib/email-recipients";
import { wrapEmailHtml, standardEmailHeaders } from "@/app/lib/email-template";
import { delay, EMAIL_SEND_DELAY_MS } from "@/app/lib/email-send-delay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_TYPE = "final_reminder";

async function logRun(
  supabase: ReturnType<typeof createAdminClient>,
  status: string,
  message: string,
  extra?: { eventId?: string; recipientsCount?: number; failedCount?: number }
) {
  const { error } = await supabase.from("scheduled_email_log").insert({
    email_type: EMAIL_TYPE,
    status,
    event_id: extra?.eventId ?? null,
    recipients_count: extra?.recipientsCount ?? null,
    failed_count: extra?.failedCount ?? null,
    message,
  });

  if (error) {
    console.error("Final reminder: failed to write log row:", error);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // IMPORTANT: this uses the service-role admin client, not the regular
  // cookie-based one. A cron job has no logged-in user/session behind
  // it, so with the regular client it would be treated as a totally
  // anonymous visitor — and if `picks` has a Row Level Security policy
  // limiting reads to "your own picks only" (sensible for normal
  // players), an anonymous request would silently get back ZERO rows.
  // That would make every player look like they hadn't picked yet,
  // which is very likely what caused already-picked players to still
  // receive this reminder.
  const supabase = createAdminClient();

  const { data: currentEvent, error: eventError } = await supabase
    .from("events")
    .select("id, venue, series, season, round_number, picks_close_at, race_date")
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error("Final reminder: event lookup error:", eventError);
    await logRun(supabase, "error", eventError.message);
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  if (!currentEvent) {
    await logRun(supabase, "no_event", "No event currently open, nothing to send.");
    return NextResponse.json({ message: "No event currently open, nothing to send." });
  }

  const daysUntilRace =
    (new Date(currentEvent.race_date).getTime() - Date.now()) /
    (1000 * 60 * 60 * 24);

  if (daysUntilRace > 2) {
    const message = `Race is ${Math.round(daysUntilRace)} days away — not this weekend, skipping.`;
    await logRun(supabase, "skipped", message, { eventId: currentEvent.id });
    return NextResponse.json({ message });
  }

  const allPlayers = await getAllPlayerEmails(supabase);

  if (allPlayers.length === 0) {
    await logRun(supabase, "skipped", "No player emails found.", { eventId: currentEvent.id });
    return NextResponse.json({ message: "No player emails found." });
  }

  const { data: submittedPicks, error: picksError } = await supabase
    .from("picks")
    .select("user_id")
    .eq("event_id", currentEvent.id);

  if (picksError) {
    console.error("Final reminder: picks lookup error:", picksError);
    await logRun(supabase, "error", picksError.message, { eventId: currentEvent.id });
    return NextResponse.json({ error: picksError.message }, { status: 500 });
  }

  const submittedUserIds = new Set(
    (submittedPicks ?? []).map((pick) => pick.user_id)
  );

  const playersWithoutPicks = allPlayers.filter(
    (player) => !submittedUserIds.has(player.id)
  );

  if (playersWithoutPicks.length === 0) {
    await logRun(supabase, "skipped", "Everyone has already submitted picks — nothing to send.", {
      eventId: currentEvent.id,
    });
    return NextResponse.json({
      message: "Everyone has already submitted picks — nothing to send.",
    });
  }

  const closeTimeLabel = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(currentEvent.picks_close_at));

  const eventLabel = `${currentEvent.season} ${currentEvent.series} · Round ${currentEvent.round_number} · ${currentEvent.venue}`;

  let sentCount = 0;
  const failedEmails: string[] = [];

  for (const player of playersWithoutPicks) {
    const bodyHtml = `
      <p>Hi ${player.display_name ?? "there"},</p>
      <p>
        You haven't entered your picks yet for
        <strong>${eventLabel}</strong>.
      </p>
      <p>
        Picks close: <strong>${closeTimeLabel}</strong> (Brisbane time)
      </p>
    `;

    try {
      const result = await resend.emails.send({
        from: "Racepicks <notifications@racepicks.app>",
        to: player.email,
        subject: `Final chance — picks close soon for ${currentEvent.venue}`,
        html: wrapEmailHtml({
          bodyHtml,
          ctaText: "Enter Your Picks Now",
          ctaHref: "https://racepicks.app/picks",
          preheaderText: `Last chance to make your picks for ${currentEvent.venue}`,
        }),
        headers: standardEmailHeaders,
      });

      if (result.error) {
        console.error(`Resend API error for ${player.email}:`, result.error);
        failedEmails.push(player.email);
      } else {
        sentCount += 1;
      }
    } catch (err) {
      console.error(`Failed to email ${player.email}:`, err);
      failedEmails.push(player.email);
    }

    await delay(EMAIL_SEND_DELAY_MS);
  }

  if (failedEmails.length > 0) {
    console.error(
      `Final reminder: ${failedEmails.length} email(s) failed to send:`,
      failedEmails
    );
  }

  const message = `Final reminder sent to ${sentCount} of ${playersWithoutPicks.length} players without picks.`;

  await logRun(supabase, "sent", message, {
    eventId: currentEvent.id,
    recipientsCount: sentCount,
    failedCount: failedEmails.length,
  });

  return NextResponse.json({
    message,
    debug: {
      eventId: currentEvent.id,
      totalPlayers: allPlayers.length,
      submittedPicksCount: submittedPicks?.length ?? 0,
      submittedUserIds: Array.from(submittedUserIds),
      playersEmailed: playersWithoutPicks.map((p) => p.email),
    },
    failedEmails,
  });
}