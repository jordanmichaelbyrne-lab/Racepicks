import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

function csvValue(value: unknown) {
  const text = String(value ?? "");

  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 }
    );
  }

  const eventId =
    request.nextUrl.searchParams.get("event");

  if (!eventId) {
    return NextResponse.json(
      { error: "Event ID is missing." },
      { status: 400 }
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("season, series, round_number, venue")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { error: eventError?.message ?? "Event not found." },
      { status: 404 }
    );
  }

  const { data: picks, error: picksError } = await supabase
    .from("picks")
    .select(
      `
        user_id,
        first_rider_id,
        second_rider_id,
        third_rider_id,
        wildcard_rider_id,
        updated_at
      `
    )
    .eq("event_id", eventId);

  if (picksError) {
    return NextResponse.json(
      { error: picksError.message },
      { status: 500 }
    );
  }

  const userIds = Array.from(
    new Set((picks ?? []).map((pick) => pick.user_id))
  );

  const riderIds = Array.from(
    new Set(
      (picks ?? []).flatMap((pick) => [
        pick.first_rider_id,
        pick.second_rider_id,
        pick.third_rider_id,
        pick.wildcard_rider_id,
      ])
    )
  );

  const [profilesResponse, ridersResponse] =
    await Promise.all([
      userIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", userIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      riderIds.length > 0
        ? supabase
            .from("riders")
            .select("id, full_name, race_number")
            .in("id", riderIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  if (profilesResponse.error) {
    return NextResponse.json(
      { error: profilesResponse.error.message },
      { status: 500 }
    );
  }

  if (ridersResponse.error) {
    return NextResponse.json(
      { error: ridersResponse.error.message },
      { status: 500 }
    );
  }

  function playerName(userId: string) {
    return (
      profilesResponse.data?.find(
        (profile) => profile.id === userId
      )?.display_name ?? "Unnamed Player"
    );
  }

  function riderName(riderId: string) {
    const rider = ridersResponse.data?.find(
      (item) => item.id === riderId
    );

    return rider
      ? `#${rider.race_number ?? "—"} ${rider.full_name}`
      : "Unknown Rider";
  }

  const rows = [
    [
      "Player",
      "1st Place",
      "2nd Place",
      "3rd Place",
      "Wildcard",
      "Updated At",
    ],
    ...(picks ?? []).map((pick) => [
      playerName(pick.user_id),
      riderName(pick.first_rider_id),
      riderName(pick.second_rider_id),
      riderName(pick.third_rider_id),
      riderName(pick.wildcard_rider_id),
      pick.updated_at,
    ]),
  ];

  const csv = rows
    .map((row) => row.map(csvValue).join(","))
    .join("\n");

  const safeVenue = event.venue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const filename = `${event.season}-${safeVenue}-picks.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}