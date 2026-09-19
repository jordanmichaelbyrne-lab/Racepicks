import { ImageResponse } from "next/og";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  manufacturer: string | null;
  team_name: string | null;
};

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

// Reads a PNG's real width/height straight from its file header, so
// the logo can be scaled to a fixed target height without guessing
// its aspect ratio (and getting it wrong, which is what stretched it
// last time). PNG's IHDR chunk always sits at a fixed byte offset:
// width is bytes 16-19, height is bytes 20-23, both big-endian.
async function getPngDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);

    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);

    if (!width || !height) {
      return null;
    }

    return { width, height };
  } catch (err) {
    console.error("Picks share image: could not read logo dimensions:", err);
    return null;
  }
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
  const { searchParams, origin } = new URL(request.url);
  const eventId = searchParams.get("event");
  const logoUrl = `${origin}/images/logos/Racepicks-Trans.png`;

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

  // Scale the logo to a fixed 44px height while preserving its real
  // aspect ratio, read directly from the file rather than guessed.
  const LOGO_TARGET_HEIGHT = 44;
  const logoDimensions = await getPngDimensions(logoUrl);
  const logoWidth = logoDimensions
    ? Math.round(
        (logoDimensions.width / logoDimensions.height) * LOGO_TARGET_HEIGHT
      )
    : 180; // fallback width if dimension-reading ever fails

  const isOpen = event.status === "open";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          flexDirection: "column",
          background: "#000000",
          padding: "48px",
          fontFamily: poppinsBold ? "Poppins" : "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="Racepicks"
          width={logoWidth}
          height={LOGO_TARGET_HEIGHT}
          style={{ marginBottom: 28 }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#f97316",
            }}
          >
            Current Round
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 700,
              color: "#ffffff",
              textTransform: "uppercase",
              lineHeight: 1.05,
            }}
          >
            {event.venue}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#a3a3a3",
            }}
          >
            {event.season} {event.series} · Round {event.round_number}
          </div>

          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 999,
              border: `2px solid ${isOpen ? "#22c55e" : "#525252"}`,
              color: isOpen ? "#22c55e" : "#a3a3a3",
              fontSize: 16,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {isOpen ? "Picks Open" : "Picks Locked"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 32,
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
                gap: 22,
                padding: "22px 26px",
                background: row.wildcard ? "#3a1f08" : "#000000",
                borderTop: index === 0 ? "none" : "1px solid #262626",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: row.wildcard ? "#f97316" : "#171717",
                  color: row.wildcard ? "#000000" : "#ffffff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                #{row.rider?.race_number ?? "—"}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#a3a3a3",
                  }}
                >
                  {row.label}
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {row.rider?.full_name ?? "Unknown rider"}
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 15,
                    color: "#a3a3a3",
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
            flexDirection: "column",
            gap: 10,
            marginTop: "auto",
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: 15, color: "#525252" }}>
              Last updated: {updatedLabel}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: 24,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              Racepicks
              <div
                style={{
                  display: "flex",
                  width: 10,
                  height: 10,
                  background: "#f97316",
                  marginLeft: 4,
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 15,
              color: "#525252",
            }}
          >
            www.racepicks.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: poppinsBold
        ? [
            { name: "Poppins", data: poppinsBold, weight: 700, style: "normal" },
            { name: "Poppins", data: poppinsMedium!, weight: 500, style: "normal" },
          ]
        : undefined,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}