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
    .select(
      "id, venue, series, season, round_number, picks_close_at, race_date"
    )
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error("Final reminder: event lookup error:", eventError);
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  if (!currentEvent) {
    return NextResponse.json({ message: "No event currently open, nothing to send." });
  }

  const daysUntilRace =
    (new Date(currentEvent.race_date).getTime() - Date.now()) /
    (1000 * 60 * 60 * 24);

  if (daysUntilRace > 2) {
    return NextResponse.json({
      message: `Race is ${Math.round(
        daysUntilRace
      )} days away — not this weekend, skipping.`,
    });
  }

  const allPlayers = await getAllPlayerEmails(supabase);

  if (allPlayers.length === 0) {
    return NextResponse.json({ message: "No player emails found." });
  }

  const { data: submittedPicks, error: picksError } = await supabase
    .from("picks")
    .select("user_id")
    .eq("event_id", currentEvent.id);

  if (picksError) {
    console.error("Final reminder: picks lookup error:", picksError);
    return NextResponse.json({ error: picksError.message }, { status: 500 });
  }

  const submittedUserIds = new Set(
    (submittedPicks ?? []).map((pick) => pick.user_id)
  );

  const playersWithoutPicks = allPlayers.filter(
    (player) => !submittedUserIds.has(player.id)
  );

  if (playersWithoutPicks.length === 0) {
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
      await resend.emails.send({
        from: "Racepicks <notifications@racepicks.app>",
        to: player.email,
        subject: `Final chance — picks close soon for ${currentEvent.venue}`,
        html: wrapEmailHtml({
          bodyHtml,
          ctaText: "Enter Your Picks Now",
          ctaHref: "https://racepicks.app/picks",
          preheaderText: `Last chance to make your picks for ${currentEvent.venue}`,
        }),
      });

      sentCount += 1;
    } catch (err) {
      console.error(`Failed to email ${player.email}:`, err);
    }
  }

  return NextResponse.json({
    message: `Final reminder sent to ${sentCount} of ${playersWithoutPicks.length} players without picks.`,
  });
}