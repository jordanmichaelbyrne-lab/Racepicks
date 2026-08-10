import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/app/lib/supabase/server";
import { getAllPlayerEmails } from "@/app/lib/email-recipients";
import { wrapEmailHtml } from "@/app/lib/email-template";

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
  const debugResults: Array<Record<string, unknown>> = [];

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
      });

      // IMPORTANT: Resend's SDK does not always throw on API-level
      // failures — it can return { data: null, error: {...} } without
      // an exception. Log the full result so real failures are visible
      // in Vercel's Function Logs instead of failing silently.
      console.log(`Resend result for ${player.email}:`, JSON.stringify(result));
      debugResults.push({ email: player.email, result });

      if (result.error) {
        console.error(`Resend API error for ${player.email}:`, result.error);
      } else {
        sentCount += 1;
      }
    } catch (err) {
      console.error(`Failed to email ${player.email}:`, err);
      debugResults.push({ email: player.email, error: String(err) });
    }
  }

  return NextResponse.json({
    message: `Picks-open reminder sent to ${sentCount} of ${players.length} players.`,
    debugResults,
  });
}