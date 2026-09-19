import { ImageResponse } from "next/og";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  manufacturer: string | null;
  team_name: string | null;
};

// Fetches a Google Font's actual font file at request time, rather
// than bundling one in the repo or hardcoding a version-specific CDN
// hash (those change whenever Google updates the font). This is the
// standard pattern for next/og — Satori (which renders the image)
// needs real font bytes, not a font-family name.
async function loadGoogleFont(family: string, weight: number) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@${weight}`;

  const cssResponse = await fetch(cssUrl);
  const css = await cssResponse.text();

  const match = css.match(
    /src: url\(([^)]+)\) format\('(opentype|truetype)'\)/
  );

  if (!match) {
    throw new Error(`Could not find a font file for ${family} ${weight}`);
  }

  const fontFileResponse = await fetch(match[1]);
  return await fontFileResponse.arrayBuffer();
}

function ordinal(position: number) {
  if (position >= 11 && position <= 13) return `${position}th`;
  const lastDigit = position % 10;
  if (lastDigit === 1) return `${position}st`;
  if (lastDigit === 2) return `${position}nd`;
  if (lastDigit === 3) return `${position}rd`;
  return `${position}th`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event");

  if (!eventId) {
    return new Response("Missing event id", { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Not signed in", { status: 401 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("venue, series, season, round_number, status, wildcard_position")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return new Response("Event not found", { status: 404 });
  }

  const { data: pick, error: pickError } = await supabase
    .from("picks")
    .select(
      "first_rider_id, second_rider_id, third_rider_id, wildcard_rider_id, updated_at"
    )
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pickError || !pick) {
    return new Response("No picks found for this round", { status: 404 });
  }

  const riderIds = [
    pick.first_rider_id,
    pick.second_rider_id,
    pick.third_rider_id,
    pick.wildcard_rider_id,
  ];

  const { data: riderData } = await supabase
    .from("riders")
    .select("id, full_name, race_number, manufacturer, team_name")
    .in("id", riderIds);

  const riders = (riderData ?? []) as Rider[];
  const findRider = (id: string) => riders.find((r) => r.id === id) ?? null;

  const rows = [
    { label: "1st Place", rider: findRider(pick.first_rider_id) },
    { label: "2nd Place", rider: findRider(pick.second_rider_id) },
    { label: "3rd Place", rider: findRider(pick.third_rider_id) },
    {
      label: `Wildcard — ${
        event.wildcard_position ? ordinal(event.wildcard_position) : ""
      }`,
      rider: findRider(pick.wildcard_rider_id),
      wildcard: true,
    },
  ];

  const updatedLabel = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(pick.updated_at));

  let poppinsBold: ArrayBuffer | null = null;
  let poppinsMedium: ArrayBuffer | null = null;

  try {
    [poppinsBold, poppinsMedium] = await Promise.all([
      loadGoogleFont("Poppins", 700),
      loadGoogleFont("Poppins", 500),
    ]);
  } catch (err) {
    console.error("Picks share image: font load failed, using fallback:", err);
  }

  const isOpen = event.status === "open";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "800px",
          display: "flex",
          flexDirection: "column",
          background: "#000000",
          padding: "56px",
          fontFamily: poppinsBold ? "Poppins" : "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#f97316",
          }}
        >
          Current Round
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            color: "#ffffff",
            textTransform: "uppercase",
            marginTop: 12,
          }}
        >
          {event.venue}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#a3a3a3",
            marginTop: 8,
          }}
        >
          {event.season} {event.series} · Round {event.round_number}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 20,
            padding: "10px 24px",
            borderRadius: 999,
            border: `2px solid ${isOpen ? "#22c55e" : "#525252"}`,
            color: isOpen ? "#22c55e" : "#a3a3a3",
            fontSize: 20,
            fontWeight: 700,
            textTransform: "uppercase",
            width: "fit-content",
          }}
        >
          {isOpen ? "Picks Open" : "Picks Locked"}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            borderRadius: 24,
            border: "1px solid #262626",
            overflow: "hidden",
          }}
        >
          {rows.map((row, index) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                padding: "28px 32px",
                background: row.wildcard ? "#3a1f08" : "#000000",
                borderTop: index === 0 ? "none" : "1px solid #262626",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  background: row.wildcard ? "#f97316" : "#171717",
                  color: row.wildcard ? "#000000" : "#ffffff",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                #{row.rider?.race_number ?? "—"}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    fontWeight: 500,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#a3a3a3",
                  }}
                >
                  {row.label}
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "#ffffff",
                    marginTop: 4,
                  }}
                >
                  {row.rider?.full_name ?? "Unknown rider"}
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    color: "#a3a3a3",
                    marginTop: 2,
                  }}
                >
                  {[row.rider?.manufacturer, row.rider?.team_name]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 32,
          }}
        >
          <div style={{ display: "flex", fontSize: 18, color: "#525252" }}>
            Last updated: {updatedLabel}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: 30,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            Racepicks
            <div
              style={{
                display: "flex",
                width: 12,
                height: 12,
                background: "#f97316",
                marginLeft: 4,
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
      fonts: poppinsBold
        ? [
            { name: "Poppins", data: poppinsBold, weight: 700, style: "normal" },
            { name: "Poppins", data: poppinsMedium!, weight: 500, style: "normal" },
          ]
        : undefined,
    }
  );
}