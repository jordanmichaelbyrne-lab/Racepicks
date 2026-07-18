import Link from "next/link";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/server";

type Event = {
  id: string;
  season: number;
  series: string;
  round_number: number;
  venue: string;
  race_date: string;
  wildcard_position: number | null;
  points_multiplier: number | string | null;
  status: string;
};

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

type ChampionshipStanding = {
  id: string;
  season: number;
  series: string;
  class_name: string;
  position: number;
  rider_name: string;
  race_number: number | null;
  manufacturer: string | null;
  points: number;
  source_url: string | null;
  updated_at: string;
};

type DisplayedRaceResult = {
  position: number | null;
  label: string;
  rider: Rider | null;
  podium: string | null;
  wildcard: boolean;
};

function ordinal(position: number) {
  const finalTwoDigits = position % 100;

  if (finalTwoDigits >= 11 && finalTwoDigits <= 13) {
    return `${position}th`;
  }

  const finalDigit = position % 10;

  if (finalDigit === 1) return `${position}st`;
  if (finalDigit === 2) return `${position}nd`;
  if (finalDigit === 3) return `${position}rd`;

  return `${position}th`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

function formatUpdatedDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

function formatSeriesName(series: string) {
  const normalised = series.trim().toLowerCase();

  if (normalised === "motocross" || normalised === "mx") {
    return "Pro Motocross";
  }

  if (normalised === "supercross" || normalised === "sx") {
    return "Supercross";
  }

  if (normalised === "smx") {
    return "SMX";
  }

  return series;
}

export default async function ResultsPage() {
  const supabase = await createClient();

  /*
   * Championship standings are loaded separately from Racepicks
   * event results. This allows the official standings to display
   * before Racepicks has completed its first round.
   */
  const {
    data: latestStandingReference,
    error: standingReferenceError,
  } = await supabase
    .from("championship_standings")
    .select(
      `
        season,
        series,
        class_name,
        updated_at,
        source_url
      `
    )
    .eq("class_name", "450")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (standingReferenceError) {
    throw new Error(standingReferenceError.message);
  }

  let championshipStandings: ChampionshipStanding[] = [];

  if (latestStandingReference) {
    const { data: standingsData, error: standingsError } =
      await supabase
        .from("championship_standings")
        .select(
          `
            id,
            season,
            series,
            class_name,
            position,
            rider_name,
            race_number,
            manufacturer,
            points,
            source_url,
            updated_at
          `
        )
        .eq("season", latestStandingReference.season)
        .eq("series", latestStandingReference.series)
        .eq("class_name", latestStandingReference.class_name)
        .order("position", { ascending: true });

    if (standingsError) {
      throw new Error(standingsError.message);
    }

    championshipStandings =
      (standingsData ?? []) as ChampionshipStanding[];
  }

  /*
   * Load the most recently completed Racepicks event.
   */
  const { data: latestEventData, error: eventError } =
    await supabase
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

  const latestEvent = latestEventData as Event | null;

  let latestResult: ResultRow | null = null;
  let displayedResults: DisplayedRaceResult[] = [];

  if (latestEvent) {
    const { data: resultData, error: resultError } =
      await supabase
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

    latestResult = resultData as ResultRow | null;

    if (latestResult) {
      const riderIds = Array.from(
        new Set([
          latestResult.first_rider_id,
          latestResult.second_rider_id,
          latestResult.third_rider_id,
          latestResult.wildcard_rider_id,
        ])
      );

      const { data: riderData, error: riderError } =
        await supabase
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
        return (
          riders.find((rider) => rider.id === riderId) ?? null
        );
      }

      displayedResults = [
        {
          position: 1,
          label: "1st",
          rider: findRider(latestResult.first_rider_id),
          podium: "🥇",
          wildcard: false,
        },
        {
          position: 2,
          label: "2nd",
          rider: findRider(latestResult.second_rider_id),
          podium: "🥈",
          wildcard: false,
        },
        {
          position: 3,
          label: "3rd",
          rider: findRider(latestResult.third_rider_id),
          podium: "🥉",
          wildcard: false,
        },
        {
          position: latestEvent.wildcard_position,
          label: latestEvent.wildcard_position
            ? ordinal(latestEvent.wildcard_position)
            : "Wildcard",
          rider: findRider(latestResult.wildcard_rider_id),
          podium: null,
          wildcard: true,
        },
      ];
    }
  }

  const standingsLeader =
    championshipStandings.length > 0
      ? championshipStandings[0]
      : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="mt-12 sm:mt-16">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Race Results
          </p>

          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-7xl">
            Results Centre
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Review the latest race result and follow the official 450
            championship standings throughout the season.
          </p>
        </section>

        {latestEvent && latestResult ? (
          <>
            <section className="mt-12">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                    Latest Race Result
                  </p>

                  <h2 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
                    {latestEvent.venue}
                  </h2>

                  <p className="mt-3 text-zinc-400">
                    {latestEvent.season} {latestEvent.series} • Round{" "}
                    {latestEvent.round_number} •{" "}
                    {formatDate(latestEvent.race_date)}
                  </p>
                </div>

                <span className="w-fit rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-green-400">
                  Official
                </span>
              </div>

              {Number(latestEvent.points_multiplier ?? 1) > 1 && (
                <span className="mt-5 inline-block rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase text-black">
                  {latestEvent.points_multiplier}× Racepicks Points
                </span>
              )}
            </section>

            <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
              <div className="hidden grid-cols-[100px_1fr_180px_140px] border-b border-zinc-800 bg-zinc-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 sm:grid">
                <div>Position</div>
                <div>Rider</div>
                <div>Manufacturer</div>
                <div className="text-right">Result</div>
              </div>

              <div className="divide-y divide-zinc-800">
                {displayedResults.map((raceResult) => (
                  <div
                    key={`${raceResult.label}-${raceResult.rider?.id ?? "unknown"}`}
                    className={`grid gap-4 px-5 py-5 sm:grid-cols-[100px_1fr_180px_140px] sm:items-center sm:px-6 ${
                      raceResult.wildcard
                        ? "bg-orange-500/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {raceResult.podium ? (
                        <span className="text-3xl">
                          {raceResult.podium}
                        </span>
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                          {raceResult.position ?? "W"}
                        </span>
                      )}

                      <span className="font-black sm:hidden">
                        {raceResult.label}
                      </span>
                    </div>

                    <div>
                      <p className="text-lg font-black">
                        #{raceResult.rider?.race_number ?? "—"}{" "}
                        {raceResult.rider?.full_name ??
                          "Unknown rider"}
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
                          {raceResult.label} Wildcard
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
                View Racepicks Championship
              </Link>

              <Link
                href="/account"
                className="rounded-full border border-zinc-700 px-7 py-3 text-center font-black transition hover:border-orange-500"
              >
                View My Score
              </Link>
            </div>
          </>
        ) : (
          <section className="mt-12 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-9">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Latest Race Result
                </p>

                <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
                  First Round Awaiting Completion
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
                  Racepicks race results will appear here after the
                  first event has been completed, published and scored.
                  The current official championship standings are
                  available below.
                </p>
              </div>

              <span className="w-fit rounded-full border border-zinc-700 bg-black px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                No Racepicks Results Yet
              </span>
            </div>
          </section>
        )}

        <section className="mt-16 border-t border-zinc-800 pt-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
                Official Championship
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
                {latestStandingReference
                  ? `${latestStandingReference.season} ${formatSeriesName(
                      latestStandingReference.series
                    )}`
                  : "450 Championship"}
              </h2>

              <p className="mt-3 text-lg font-black uppercase text-zinc-400">
                450 Championship Standings
              </p>
            </div>

            {latestStandingReference && (
              <div className="sm:text-right">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
                  Last Updated
                </p>

                <p className="mt-1 text-sm font-bold text-zinc-400">
                  {formatUpdatedDate(
                    latestStandingReference.updated_at
                  )}
                </p>
              </div>
            )}
          </div>

          {championshipStandings.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
              <h3 className="text-2xl font-black uppercase">
                No Standings Imported
              </h3>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-zinc-500">
                Championship standings will appear here after they have
                been imported through Race Control.
              </p>
            </div>
          ) : (
            <>
              {standingsLeader && (
                <section className="mt-8 rounded-3xl border border-orange-500/30 bg-orange-500/10 p-6 sm:p-8">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-5">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-black text-black">
                        1
                      </span>

                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-orange-400">
                          Championship Leader
                        </p>

                        <h3 className="mt-2 text-2xl font-black sm:text-3xl">
                          {standingsLeader.rider_name}
                        </h3>

                        {(standingsLeader.race_number ||
                          standingsLeader.manufacturer) && (
                          <p className="mt-1 text-sm text-zinc-400">
                            {standingsLeader.race_number
                              ? `#${standingsLeader.race_number}`
                              : ""}

                            {standingsLeader.race_number &&
                            standingsLeader.manufacturer
                              ? " • "
                              : ""}

                            {standingsLeader.manufacturer ?? ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-4xl font-black">
                        {standingsLeader.points}
                      </p>

                      <p className="text-xs font-black uppercase tracking-widest text-orange-400">
                        Championship Points
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                <div className="hidden grid-cols-[100px_1fr_150px_130px_110px] border-b border-zinc-800 bg-zinc-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 md:grid">
                  <div>Position</div>
                  <div>Rider</div>
                  <div>Manufacturer</div>
                  <div className="text-right">Gap</div>
                  <div className="text-right">Points</div>
                </div>

                <div className="divide-y divide-zinc-800">
                  {championshipStandings.map((standing) => {
                    const pointsGap = standingsLeader
                      ? standingsLeader.points - standing.points
                      : 0;

                    return (
                      <article
                        key={standing.id}
                        className="grid grid-cols-[52px_1fr_auto] items-center gap-3 px-4 py-5 sm:px-6 md:grid-cols-[100px_1fr_150px_130px_110px]"
                      >
                        <div>
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${
                              standing.position === 1
                                ? "bg-orange-500 text-black"
                                : standing.position <= 3
                                  ? "bg-zinc-700 text-white"
                                  : "bg-zinc-900 text-zinc-400"
                            }`}
                          >
                            {standing.position}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black sm:text-lg">
                            {standing.rider_name}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-zinc-500 md:hidden">
                            {standing.race_number && (
                              <span>#{standing.race_number}</span>
                            )}

                            {standing.manufacturer && (
                              <span>{standing.manufacturer}</span>
                            )}

                            {standing.position !== 1 && (
                              <span>Gap: -{pointsGap}</span>
                            )}
                          </div>
                        </div>

                        <div className="hidden text-sm font-bold text-zinc-400 md:block">
                          {standing.manufacturer ?? "—"}
                        </div>

                        <div className="hidden text-right text-sm font-bold text-zinc-500 md:block">
                          {standing.position === 1
                            ? "Leader"
                            : `-${pointsGap}`}
                        </div>

                        <div className="text-right">
                          <span className="text-xl font-black">
                            {standing.points}
                          </span>

                          <span className="ml-1 text-[10px] font-black uppercase text-zinc-600">
                            pts
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center">
                <p className="text-sm leading-6 text-zinc-500">
                  Official championship standings imported through
                  Race Control and updated after each race weekend.
                </p>

                {latestStandingReference?.source_url && (
                  <a
                    href={latestStandingReference.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm font-black text-orange-500 transition hover:text-orange-400"
                  >
                    View original source ↗
                  </a>
                )}
              </div>
            </>
          )}
        </section>

        <div className="h-16" />
      </div>
    </main>
  );
}