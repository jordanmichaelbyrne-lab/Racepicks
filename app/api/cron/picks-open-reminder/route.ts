import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/app/lib/supabase/server";
import { getAllPlayerEmails } from "@/app/lib/email-recipients";
import { wrapEmailHtml, standardEmailHeaders } from "@/app/lib/email-template";
import { delay, EMAIL_SEND_DELAY_MS } from "@/app/lib/email-send-delay";

// See final-reminder/route.ts for why this matters — without it, Next.js
// can serve stale cached data instead of querying Supabase fresh on
// every cron invocation.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: currentEvent, error: eventError } = await supabase
    .from("events")
    .select("id, venue, series, season, round_number, picks_close_at, race_date")
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error("Picks-open reminder: event lookup error:", eventError);
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  if (!currentEvent) {
    return NextResponse.json({ message: "No event currently open, nothing to send." });
  }

  const daysUntilRace =
    (new Date(currentEvent.race_date).getTime() - Date.now()) /
    (1000 * 60 * 60 * 24);

  if (daysUntilRace > 6) {
    return NextResponse.json({
      message: `Race is ${Math.round(
        daysUntilRace
      )} days away — not this week's race, skipping.`,
    });
  }

  const players = await getAllPlayerEmails(supabase);

  if (players.length === 0) {
    return NextResponse.json({ message: "No player emails found." });
  }

  const closeTimeLabel = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(currentEvent.picks_close_at));

  const eventLabel = `${currentEvent.season} ${currentEvent.series} · Round ${currentEvent.round_number} · ${currentEvent.venue}`;

  let sentCount = 0;
  const failedEmails: string[] = [];

  for (const player of players) {
    const bodyHtml = `
      <p>Hi ${player.display_name ?? "there"},</p>
      <p>
        Picks are now open for <strong>${eventLabel}</strong>.
      </p>
      <p>
        Picks close: <strong>${closeTimeLabel}</strong> (Brisbane time)
      </p>
    `;

    try {
      const result = await resend.emails.send({
        from: "Racepicks <notifications@racepicks.app>",
        to: player.email,
        subject: `Picks are open — ${currentEvent.venue}`,
        html: wrapEmailHtml({
          bodyHtml,
          ctaText: "Enter Your Picks",
          ctaHref: "https://racepicks.app/picks",
          preheaderText: `Picks are open for ${currentEvent.venue}`,
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
      `Picks-open reminder: ${failedEmails.length} email(s) failed to send:`,
      failedEmails
    );
  }

  return NextResponse.json({
    message: `Picks-open reminder sent to ${sentCount} of ${players.length} players.`,
    failedEmails,
  });
}