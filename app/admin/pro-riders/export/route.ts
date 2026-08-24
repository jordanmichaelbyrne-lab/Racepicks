import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const season = Number.parseInt(searchParams.get("season") ?? "2027", 10) || 2027;

  const { data: riders, error: ridersError } = await supabase
    .from("riders")
    .select("id, full_name, race_number, team_name, manufacturer, pro_eligible")
    .eq("is_active", true)
    .eq("class_name", "450")
    .order("race_number", { ascending: true });

  if (ridersError) {
    return NextResponse.json({ error: ridersError.message }, { status: 500 });
  }

  const { data: seasonRows, error: seasonError } = await supabase
    .from("pro_rider_seasons")
    .select("*")
    .eq("season", season);

  if (seasonError) {
    return NextResponse.json({ error: seasonError.message }, { status: 500 });
  }

  const seasonByRiderId = new Map(
    (seasonRows ?? []).map((row) => [row.rider_id, row])
  );

  const headers = [
    "rider_id",
    "race_number",
    "rider_name",
    "team",
    "current_manufacturer",
    "pro_manufacturer",
    "pro_eligible",
    "sx_classification",
    "mx_classification",
    "smx_classification",
    "salary_category",
    "starting_salary",
    "current_salary",
    "sx_active",
    "mx_active",
    "smx_active",
    "injury_status",
    "admin_notes",
  ];

  function escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const lines = [headers.join(",")];

  for (const rider of riders ?? []) {
    const seasonRow = seasonByRiderId.get(rider.id);

    const row = [
      rider.id,
      rider.race_number ?? "",
      rider.full_name,
      rider.team_name ?? "",
      rider.manufacturer ?? "",
      seasonRow?.manufacturer ?? "",
      rider.pro_eligible ? "true" : "false",
      seasonRow?.sx_classification ?? "",
      seasonRow?.mx_classification ?? "",
      seasonRow?.smx_classification ?? "",
      seasonRow?.salary_category ?? "",
      seasonRow?.starting_salary ?? "",
      seasonRow?.current_salary ?? "",
      seasonRow?.sx_active ?? "true",
      seasonRow?.mx_active ?? "true",
      seasonRow?.smx_active ?? "true",
      seasonRow?.injury_status ?? "healthy",
      seasonRow?.admin_notes ?? "",
    ];

    lines.push(row.map(escapeCsv).join(","));
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="racepicks-pro-riders-${season}.csv"`,
    },
  });
}