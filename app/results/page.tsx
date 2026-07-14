import Link from "next/link";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/server";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  manufacturer: string | null;
  team_name: string | null;
};

type ResultRow = {
  event_id: string;
  first_rider_id: string;
  second_rider_id: string;
  third_rider_id: string;
  wildcard_rider_id: string;
  entered_at: string;
};

function ordinal(position: number) {
  if (position >= 11 && position <= 13) {
    return `${position}th`;
  }

  const finalDigit = position % 10;

  if (finalDigit === 1) return `${position}st`;
  if (finalDigit === 2) return `${position}nd`;
  if (finalDigit === 3) return `${position}rd`;

  return `${position}th`;
}

export default async function ResultsPage() {
  const supabase = await createClient();

  const { data: latestEvent, error: eventError } = await supabase
    .from("events")
    .select(
      `
        id,
        season,
        series,
        round_number,
        venue,
        race_date,
        wildcard_position,
        points_multiplier,
        status
      `
    )
    .eq("status", "completed")
    .order("race_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message);
  }

  if (!latestEvent) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Navbar />

          <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center text-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
                Race Results
              </p>

              <h1 className="mt-4 text-5xl font-black uppercase sm:text-7xl">
                No Results Yet
              </h1>

              <p className="mt-5 text-zinc-400">
                Official race results will appear here after the first
                round has been completed and scored.
              </p>

              <Link
                href="/"
                className="mt-8 inline-block rounded-full bg-orange-500 px-7 py-3 font-black text-black"
              >
                Back to Race Centre
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { data: resultData, error: resultError } = await supabase
    .from("results")
    .select(
      `
        event_id,
        first_rider_id,
        second_rider_id,
        third_rider_id,
        wildcard_rider_id,
        entered_at
      `
    )
    .eq("event_id", latestEvent.id)
    .maybeSingle();

  if (resultError) {
    throw new Error(resultError.message);
  }

  const result = resultData as ResultRow | null;

  if (!result) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Navbar />

          <section className="py-20 text-center">
            <h1 className="text-4xl font-black">
              Results are being prepared
            </h1>
          </section>
        </div>
      </main>
    );
  }

  const riderIds = [
    result.first_rider_id,
    result.second_rider_id,
    result.third_rider_id,
    result.wildcard_rider_id,
  ];

  const { data: riderData, error: riderError } = await supabase
    .from("riders")
    .select(
      `
        id,
        full_name,
        race_number,
        manufacturer,
        team_name
      `
    )
    .in("id", riderIds);

  if (riderError) {
    throw new Error(riderError.message);
  }

  const riders = (riderData ?? []) as Rider[];

  function findRider(riderId: string) {
    return riders.find((rider) => rider.id === riderId) ?? null;
  }

  const displayedResults = [
    {
      position: 1,
      label: "1st",
      rider: findRider(result.first_rider_id),
      podium: "🥇",
      wildcard: false,
    },
    {
      position: 2,
      label: "2nd",
      rider: findRider(result.second_rider_id),
      podium: "🥈",
      wildcard: false,
    },
    {
      position: 3,
      label: "3rd",
      rider: findRider(result.third_rider_id),
      podium: "🥉",
      wildcard: false,
    },
    {
      position: latestEvent.wildcard_position,
      label: latestEvent.wildcard_position
        ? ordinal(latestEvent.wildcard_position)
        : "Wildcard",
      rider: findRider(result.wildcard_rider_id),
      podium: null,
      wildcard: true,
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="mt-12 sm:mt-16">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Official Race Results
          </p>

          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-7xl">
            {latestEvent.venue}
          </h1>

          <p className="mt-4 text-zinc-400">
            {latestEvent.season} {latestEvent.series} • Round{" "}
            {latestEvent.round_number}
          </p>

          {Number(latestEvent.points_multiplier ?? 1) > 1 && (
            <span className="mt-5 inline-block rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase text-black">
              {latestEvent.points_multiplier}× Racepicks Points
            </span>
          )}
        </section>

        <section className="mt-10 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div className="hidden grid-cols-[100px_1fr_180px_140px] border-b border-zinc-800 bg-zinc-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 sm:grid">
            <div>Position</div>
            <div>Rider</div>
            <div>Manufacturer</div>
            <div className="text-right">Result</div>
          </div>

          <div className="divide-y divide-zinc-800">
            {displayedResults.map((raceResult) => (
              <div
                key={`${raceResult.label}-${raceResult.rider?.id}`}
                className={
                  raceResult.wildcard
                    ? "grid gap-4 bg-orange-500/10 px-5 py-5 sm:grid-cols-[100px_1fr_180px_140px] sm:items-center sm:px-6"
                    : "grid gap-4 px-5 py-5 sm:grid-cols-[100px_1fr_180px_140px] sm:items-center sm:px-6"
                }
              >
                <div className="flex items-center gap-3">
                  {raceResult.podium ? (
                    <span className="text-3xl">{raceResult.podium}</span>
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                      {raceResult.position}
                    </span>
                  )}

                  <span className="font-black sm:hidden">
                    {raceResult.label}
                  </span>
                </div>

                <div>
                  <p className="text-lg font-black">
                    #{raceResult.rider?.race_number ?? "—"}{" "}
                    {raceResult.rider?.full_name ?? "Unknown rider"}
                  </p>

                  {raceResult.rider?.team_name && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {raceResult.rider.team_name}
                    </p>
                  )}
                </div>

                <div className="text-sm font-bold text-zinc-400">
                  {raceResult.rider?.manufacturer ?? "—"}
                </div>

                <div className="sm:text-right">
                  {raceResult.wildcard ? (
                    <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase text-black">
                      Wildcard
                    </span>
                  ) : (
                    <span className="text-sm font-black text-zinc-500">
                      Official
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/leaderboard"
            className="rounded-full bg-orange-500 px-7 py-3 text-center font-black text-black transition hover:bg-orange-400"
          >
            View Championship
          </Link>

          <Link
            href="/account"
            className="rounded-full border border-zinc-700 px-7 py-3 text-center font-black transition hover:border-orange-500"
          >
            View My Score
          </Link>
        </div>
      </div>
    </main>
  );
}