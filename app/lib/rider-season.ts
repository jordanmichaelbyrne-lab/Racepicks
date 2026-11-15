import { createClient } from "@/app/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type RiderSeasonDetails = {
  class_name: string | null;
  race_number: number | null;
  manufacturer: string | null;
};

// Looks up what each rider's number / bike / class were IN A GIVEN
// SEASON (frozen in the rider_seasons table), so a page about a 2026
// round keeps showing 2026 details even after riders change bikes or
// numbers for 2027. If a rider has no record for that season, callers
// fall back to whatever is on the riders table.
export async function getRiderSeasonDetails(
  supabase: Supa,
  riderIds: string[],
  season: number | null | undefined
): Promise<Map<string, RiderSeasonDetails>> {
  const details = new Map<string, RiderSeasonDetails>();
  const ids = Array.from(new Set(riderIds.filter(Boolean)));

  if (!season || ids.length === 0) {
    return details;
  }

  const { data, error } = await supabase
    .from("rider_seasons")
    .select("rider_id, class_name, race_number, manufacturer")
    .eq("season", season)
    .in("rider_id", ids);

  if (error) {
    console.error("Rider season details error:", error);
    return details;
  }

  for (const row of data ?? []) {
    details.set(row.rider_id as string, {
      class_name: row.class_name as string | null,
      race_number: row.race_number as number | null,
      manufacturer: row.manufacturer as string | null,
    });
  }

  return details;
}

// Swaps in the season's number (and bike, when the rider object has
// one) for every rider that has a record. Everything else is untouched.
export function applyRiderSeason<
  T extends {
    id: string;
    race_number: number | null;
    manufacturer?: string | null;
  }
>(riders: T[], details: Map<string, RiderSeasonDetails>): T[] {
  return riders.map((rider) => {
    const season = details.get(rider.id);

    if (!season) {
      return rider;
    }

    return {
      ...rider,
      race_number: season.race_number,
      ...("manufacturer" in rider
        ? { manufacturer: season.manufacturer }
        : {}),
    };
  });
}