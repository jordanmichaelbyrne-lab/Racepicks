import { Resend } from "resend";
import { createClient } from "./supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function notifyPlayersOfWithdrawnRiders(
  supabase: SupabaseServerClient,
  eventId: string,
  previousConfirmedRiderIds: string[],
  newConfirmedRiderIds: string[]
) {
  const newRiderIdSet = new Set(newConfirmedRiderIds);

  const withdrawnRiderIds = Array.from(
    new Set(
      previousConfirmedRiderIds.filter(
        (riderId) => !newRiderIdSet.has(riderId)
      )
    )
  );

  if (withdrawnRiderIds.length === 0) {
    return;
  }

  // Load event details, for a friendly email subject/body.
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("venue, series, season, round_number")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    console.error(
      "Withdrawn-rider notification: could not load event:",
      eventError
    );
    return;
  }

  // Load the names of the withdrawn riders, for the email text.
  const { data: withdrawnRiders, error: ridersError } = await supabase
    .from("riders")
    .select("id, full_name")
    .in("id", withdrawnRiderIds);

  if (ridersError) {
    console.error(
      "Withdrawn-rider notification: could not load rider names:",
      ridersError
    );
    return;
  }

  const riderNameById = new Map(
    (withdrawnRiders ?? []).map((rider) => [rider.id, rider.full_name])
  );

  // Find every pick for this event that used one of the withdrawn riders,
  // in any of the four positions.
  const { data: affectedPicks, error: picksError } = await supabase
    .from("picks")
    .select(
      "user_id, first_rider_id, second_rider_id, third_rider_id, wildcard_rider_id"
    )
    .eq("event_id", eventId)
    .or(
      withdrawnRiderIds
        .flatMap((riderId) => [
          `first_rider_id.eq.${riderId}`,
          `second_rider_id.eq.${riderId}`,
          `third_rider_id.eq.${riderId}`,
          `wildcard_rider_id.eq.${riderId}`,
        ])
        .join(",")
    );

  if (picksError) {
    console.error(
      "Withdrawn-rider notification: could not load affected picks:",
      picksError
    );
    return;
  }

  if (!affectedPicks || affectedPicks.length === 0) {
    return;
  }

  // Work out, per affected player, which specific rider(s) of theirs
  // were withdrawn.
  const withdrawnRiderNamesByUser = new Map<string, string[]>();

  for (const pick of affectedPicks) {
    const pickedRiderIds = [
      pick.first_rider_id,
      pick.second_rider_id,
      pick.third_rider_id,
      pick.wildcard_rider_id,
    ];

    const namesForThisUser = pickedRiderIds
      .filter((riderId) => withdrawnRiderIds.includes(riderId))
      .map((riderId) => riderNameById.get(riderId))
      .filter((name): name is string => Boolean(name));

    if (namesForThisUser.length > 0) {
      withdrawnRiderNamesByUser.set(pick.user_id, namesForThisUser);
    }
  }

  const affectedUserIds = Array.from(withdrawnRiderNamesByUser.keys());

  if (affectedUserIds.length === 0) {
    return;
  }

  // Load email + display name for each affected player.
  const { data: affectedProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", affectedUserIds);

  if (profilesError) {
    console.error(
      "Withdrawn-rider notification: could not load player profiles:",
      profilesError
    );
    return;
  }

  const eventLabel = `${event.season} ${event.series} · Round ${event.round_number} · ${event.venue}`;

  for (const profile of affectedProfiles ?? []) {
    if (!profile.email) {
      continue;
    }

    const riderNames = withdrawnRiderNamesByUser.get(profile.id) ?? [];

    if (riderNames.length === 0) {
      continue;
    }

    const riderList = riderNames.join(", ");
    const firstName = profile.display_name ?? "there";

    try {
      await resend.emails.send({
        from: "Racepicks <notifications@racepicks.app>",
        to: profile.email,
        subject: `Action needed: your rider is no longer entered — ${event.venue}`,
        html: `
          <p>Hi ${firstName},</p>
          <p>
            The entry list for <strong>${eventLabel}</strong> has just been
            updated, and the following rider${
              riderNames.length > 1 ? "s" : ""
            } you picked ${
          riderNames.length > 1 ? "are" : "is"
        } no longer entered:
          </p>
          <p><strong>${riderList}</strong></p>
          <p>
            Please update your picks before Saturday 10PM so they count
            toward this round.
          </p>
          <p>
            <a href="https://racepicks.app/picks">Update your picks</a>
          </p>
          <p>— Racepicks</p>
        `,
      });
    } catch (err) {
      console.error(
        `Withdrawn-rider notification: failed to email ${profile.email}:`,
        err
      );
    }
  }
}