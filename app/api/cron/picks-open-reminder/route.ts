import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/app/lib/supabase/server";
import { getAllPlayerEmails } from "@/app/lib/email-recipients";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  // Vercel automatically sends this header on scheduled cron calls,
  // using the CRON_SECRET environment variable — this check stops
  // anyone else from triggering the route manually.
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

  for (const player of players) {
    try {
      await resend.emails.send({
        from: "Racepicks <notifications@racepicks.app>",
        to: player.email,
        subject: `Picks are open — ${currentEvent.venue}`,
        html: `
          <p>Hi ${player.display_name ?? "there"},</p>
          <p>
            Picks are now open for <strong>${eventLabel}</strong>.
          </p>
          <p>
            Picks close: <strong>${closeTimeLabel}</strong> (Brisbane time)
          </p>
          <p>
            <a href="https://racepicks.app/picks">Enter your picks</a>
          </p>
          <p>— Racepicks</p>
        `,
      });

      sentCount += 1;
    } catch (err) {
      console.error(`Failed to email ${player.email}:`, err);
    }
  }

  return NextResponse.json({
    message: `Picks-open reminder sent to ${sentCount} of ${players.length} players.`,
  });
}