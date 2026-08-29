import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/app/lib/supabase/server";
import { getSeriesStandings } from "@/app/lib/series-standings";

type CompetitionEvent = {
  id: string;
  competition_slug: string;
  series: string;
  season: number;
  round_number: number;
  venue: string;
  location: string | null;
  race_date: string;
  picks_close_at: string;
  wildcard_position: number | null;
  status: string;
  points_multiplier: number | string | null;
};

type PageProps = {
  params: Promise<{
    competitionId: string;
  }>;
};

function ordinal(position: number) {
  if (position >= 11 && position <= 13) {
    return `${position}th`;
  }

  const ending = position % 10;

  if (ending === 1) return `${position}st`;
  if (ending === 2) return `${position}nd`;
  if (ending === 3) return `${position}rd`;

  return `${position}th`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

function getCompetitionName(
  season: number,
  series: string
) {
  if (series === "Supercross") {
    return `${season} Supercross`;
  }

  if (series === "Motocross") {
    return `${season} Pro Motocross`;
  }

  if (series === "SMX") {
    return `${season} SMX Championship`;
  }

  return `${season} ${series}`;
}

function getCompetitionDescription(series: string) {
  if (series === "Supercross") {
    return "The stadium-based Supercross championship.";
  }

  if (series === "Motocross") {
    return "The Pro Motocross outdoor championship.";
  }

  if (series === "SMX") {
    return "The season-ending SuperMotocross playoffs.";
  }

  return "Racepicks championship series.";
}

function getSeriesCode(series: string) {
  if (series === "Supercross") return "SX";
  if (series === "Motocross") return "MX";
  if (series === "SMX") return "SMX";

  return series.toUpperCase();
}

function getStatusDetails(status: string) {
  switch (status) {
    case "open":
      return {
        label: "Live",
        classes:
          "border-green-500/30 bg-green-500/10 text-green-400",
      };

    case "closed":
      return {
        label: "Picks Closed",
        classes:
          "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
      };

    case "completed":
    case "scored":
    case "archived":
      return {
        label: "Complete",
        classes:
          "border-blue-500/30 bg-blue-500/10 text-blue-400",
      };

    default:
      return {
        label: "Upcoming",
        classes:
          "border-zinc-700 bg-zinc-900 text-zinc-400",
      };
  }
}

function isCompletedStatus(status: string) {
  return ["completed", "scored", "archived"].includes(
    status
  );
}

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getStandingMedalStyle(position: number) {
  if (position === 1) return "bg-orange-500 text-black";
  if (position <= 3) return "bg-zinc-700 text-white";
  return "bg-zinc-900 text-zinc-400";
}

export default async function CompetitionPage({
  params,
}: PageProps) {
  const { competitionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("events")
    .select(
      `
        id,
        competition_slug,
        series,
        season,
        round_number,
        venue,
        location,
        race_date,
        picks_close_at,
        wildcard_position,
        status,
        points_multiplier
      `
    )
    .eq("competition_slug", competitionId)
    .order("round_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const events = (data ?? []) as CompetitionEvent[];

  if (events.length === 0) {
    notFound();
  }

  const firstEvent = events[0];
  const season = firstEvent.season;
  const series = firstEvent.series;

  const competitionName = getCompetitionName(
    season,
    series
  );

  const competitionDescription =
    getCompetitionDescription(series);

  const seriesCode = getSeriesCode(series);

  const liveEvent =
    events.find((event) => event.status === "open") ??
    null;

  const upcomingEvents = events
    .filter(
      (event) =>
        event.status === "upcoming" &&
        new Date(event.race_date).getTime() > Date.now()
    )
    .sort(
      (first, second) =>
        new Date(first.race_date).getTime() -
        new Date(second.race_date).getTime()
    );

  const nextEvent =
    liveEvent ??
    upcomingEvents[0] ??
    events[events.length - 1];

  const nextAfterCurrent =
    liveEvent
      ? upcomingEvents.find(
          (event) =>
            new Date(event.race_date).getTime() >
            new Date(liveEvent.race_date).getTime()
        ) ?? null
      : upcomingEvents[1] ?? null;

  const completedRounds = events.filter((event) =>
    isCompletedStatus(event.status)
  ).length;

  const activeRoundNumber =
    liveEvent?.round_number ??
    nextEvent?.round_number ??
    completedRounds;

  const seasonProgress =
    events.length > 0
      ? Math.min(100, Math.round((completedRounds / events.length) * 100))
      : 0;

  const currentStatus = liveEvent
    ? "Live"
    : completedRounds === events.length
      ? "Completed"
      : "Upcoming";

  // Racepicks standings for THIS series + season — same calculation
  // used by the series-finale celebration popup, but the full ranked
  // list rather than just the top 3, meant to be browsable any time,
  // not only right when the series wraps.
  const standings = await getSeriesStandings(supabase, series, season);
  const standingsLeader = standings.length > 0 ? standings[0] : null;

  // "Championship Stats" — total players, average round score, and
  // the most-picked riders, all scoped to just this competition's own
  // events. Reuses the already-loaded `events` list, so this stays
  // correctly scoped for any series/season without extra queries to
  // work out which rounds belong here.
  const eventIds = events.map((event) => event.id);

  let totalPlayersParticipated = 0;
  let totalPicksSubmitted = 0;
  let averageRoundScore = 0;
  let mostPickedRiders: {
    riderId: string;
    fullName: string;
    raceNumber: number | null;
    pickCount: number;
  }[] = [];

  if (eventIds.length > 0) {
    const { data: seriesPicksData, error: seriesPicksError } =
      await supabase
        .from("picks")
        .select(
          "user_id, first_rider_id, second_rider_id, third_rider_id, wildcard_rider_id"
        )
        .in("event_id", eventIds);

    if (seriesPicksError) {
      console.error(
        "Championship stats: error loading picks:",
        seriesPicksError
      );
    }

    const picks = seriesPicksData ?? [];
    totalPicksSubmitted = picks.length;
    totalPlayersParticipated = new Set(
      picks.map((pick) => pick.user_id)
    ).size;

    const riderPickCounts = new Map<string, number>();

    for (const pick of picks) {
      for (const riderId of [
        pick.first_rider_id,
        pick.second_rider_id,
        pick.third_rider_id,
        pick.wildcard_rider_id,
      ]) {
        if (!riderId) continue;
        riderPickCounts.set(
          riderId,
          (riderPickCounts.get(riderId) ?? 0) + 1
        );
      }
    }

    const topRiderIds = Array.from(riderPickCounts.entries())
      .sort((first, second) => second[1] - first[1])
      .slice(0, 3)
      .map(([riderId]) => riderId);

    if (topRiderIds.length > 0) {
      const { data: riderNameRows, error: riderNameError } =
        await supabase
          .from("riders")
          .select("id, full_name, race_number")
          .in("id", topRiderIds);

      if (riderNameError) {
        console.error(
          "Championship stats: error loading rider names:",
          riderNameError
        );
      }

      const riderById = new Map(
        (riderNameRows ?? []).map((rider) => [rider.id, rider])
      );

      mostPickedRiders = topRiderIds.map((riderId) => ({
        riderId,
        fullName:
          riderById.get(riderId)?.full_name ?? "Unknown rider",
        raceNumber: riderById.get(riderId)?.race_number ?? null,
        pickCount: riderPickCounts.get(riderId) ?? 0,
      }));
    }

    const { data: seriesScoresData, error: seriesScoresError } =
      await supabase
        .from("scores")
        .select("round_points")
        .in("event_id", eventIds);

    if (seriesScoresError) {
      console.error(
        "Championship stats: error loading scores:",
        seriesScoresError
      );
    }

    const scoreRows = seriesScoresData ?? [];

    averageRoundScore =
      scoreRows.length > 0
        ? Math.round(
            scoreRows.reduce(
              (sum, row) => sum + (row.round_points ?? 0),
              0
            ) / scoreRows.length
          )
        : 0;
  }

  // "Official Standings" — the real-world riders' championship, for
  // this exact season + series. This is the same championship_standings
  // table your Racer X importer already writes to on /admin/standings —
  // scoping by this page's own season/series (rather than "whatever
  // was imported most recently", which is what /results does) means
  // this always shows the right series' standings even after a newer
  // import has happened for a different series since.
  const { data: officialStandingsData, error: officialStandingsError } =
    await supabase
      .from("championship_standings")
      .select("id, position, rider_name, race_number, manufacturer, points")
      .eq("season", season)
      .eq("series", series)
      .eq("class_name", "450")
      .order("position", { ascending: true });

  if (officialStandingsError) {
    console.error(
      "Official standings loading error:",
      officialStandingsError
    );
  }

  const officialStandings = officialStandingsData ?? [];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-12 sm:py-16">
          <Link
            href="/"
            className="text-sm font-bold text-zinc-500 transition hover:text-orange-500"
          >
            ← Back to homepage
          </Link>

          <div className="mt-10 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
            <div className="relative p-7 sm:p-10 lg:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent" />

              <div className="relative">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-orange-500">
                      {season} Championship Series
                    </p>

                    <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-none tracking-tight sm:text-7xl lg:text-8xl">
                      {competitionName}
                    </h1>

                    <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
                      {competitionDescription}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-5 py-2 text-xs font-black uppercase tracking-wider ${
                      currentStatus === "Live"
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : currentStatus === "Completed"
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {currentStatus}
                  </span>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-zinc-800 bg-black/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Championship
                    </p>

                    <p className="mt-3 text-3xl font-black">
                      {seriesCode}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Total Rounds
                    </p>

                    <p className="mt-3 text-3xl font-black">
                      {events.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Completed
                    </p>

                    <p className="mt-3 text-3xl font-black">
                      {completedRounds}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                      Current Round
                    </p>

                    <p className="mt-3 text-3xl font-black">
                      Round {activeRoundNumber}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Season Progress
                    </p>

                    <p className="text-sm font-black text-zinc-300">
                      {completedRounds} / {events.length} rounds
                    </p>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{
                        width: `${seasonProgress}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {series === "SMX" ? (
            /* SMX Playoffs is only ever 3 rounds — short enough that
               "Next" + "Coming Up" would leave the Final off-screen
               entirely. Show every round as its own tile instead. */
            <section className="mt-8 grid gap-5 lg:grid-cols-3">
              {events.map((event) => {
                const isNext = event.id === nextEvent.id;
                const status = getStatusDetails(event.status);
                const multiplier = Number(event.points_multiplier ?? 1);

                return (
                  <div
                    key={event.id}
                    className={`rounded-3xl border p-7 ${
                      isNext
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={`text-xs font-black uppercase tracking-[0.3em] ${
                          isNext ? "text-orange-500" : "text-zinc-500"
                        }`}
                      >
                        Round {event.round_number}
                        {multiplier > 1 ? ` · ${multiplier}× Points` : ""}
                      </p>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase ${status.classes}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-black uppercase leading-tight sm:text-3xl">
                      {event.venue}
                    </h2>

                    {event.location && (
                      <p className="mt-2 text-sm text-zinc-400">
                        {event.location}
                      </p>
                    )}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-800 bg-black/70 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Race Date
                        </p>

                        <p className="mt-1 text-sm font-black">
                          {formatDate(event.race_date)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-800 bg-black/70 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Wildcard
                        </p>

                        <p className="mt-1 text-sm font-black">
                          {typeof event.wildcard_position === "number"
                            ? ordinal(event.wildcard_position)
                            : "Pending"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      {event.status === "open" && (
                        <Link
                          href="/picks"
                          className="rounded-full bg-orange-500 px-6 py-2.5 text-center text-sm font-black text-black transition hover:bg-orange-400"
                        >
                          Enter Picks
                        </Link>
                      )}

                      {isCompletedStatus(event.status) && (
                        <Link
                          href="/results"
                          className="rounded-full border border-zinc-700 px-6 py-2.5 text-center text-sm font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
                        >
                          View Results
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ) : (
            <section className="mt-8 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-orange-500/30 bg-orange-500/5 p-7 sm:p-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                      {liveEvent
                        ? "Current Event"
                        : "Next Event"}
                    </p>

                    <h2 className="mt-3 text-4xl font-black uppercase">
                      {nextEvent.venue}
                    </h2>

                    <p className="mt-3 text-zinc-400">
                      Round {nextEvent.round_number}
                      {nextEvent.location
                        ? ` • ${nextEvent.location}`
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase ${
                      getStatusDetails(nextEvent.status).classes
                    }`}
                  >
                    {getStatusDetails(nextEvent.status).label}
                  </span>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-black/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Race Date
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {formatDate(nextEvent.race_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Wildcard
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {typeof nextEvent.wildcard_position ===
                      "number"
                        ? ordinal(nextEvent.wildcard_position)
                        : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {nextEvent.status === "open" && (
                    <Link
                      href="/picks"
                      className="rounded-full bg-orange-500 px-7 py-3 text-center font-black text-black transition hover:bg-orange-400"
                    >
                      Enter Picks
                    </Link>
                  )}

                  <Link
                    href="/results"
                    className="rounded-full border border-zinc-700 px-7 py-3 text-center font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
                  >
                    View Race Results
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                  Coming Up
                </p>

                {nextAfterCurrent ? (
                  <>
                    <h2 className="mt-3 text-4xl font-black uppercase">
                      {nextAfterCurrent.venue}
                    </h2>

                    <p className="mt-3 text-zinc-400">
                      Round {nextAfterCurrent.round_number}
                      {nextAfterCurrent.location
                        ? ` • ${nextAfterCurrent.location}`
                        : ""}
                    </p>

                    <div className="mt-7 rounded-2xl border border-zinc-800 bg-black p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Race Date
                      </p>

                      <p className="mt-2 text-xl font-black">
                        {formatDate(nextAfterCurrent.race_date)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-56 flex-col justify-center text-center">
                    <h2 className="text-3xl font-black">
                      Final Round
                    </h2>

                    <p className="mt-3 text-zinc-400">
                      There are no later events currently loaded for
                      this championship.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Racepicks Standings — full ranked table for this series
              + season, browsable any time (not just right after it
              ends). Empty state shown until at least one round here
              has been scored. */}
          <section className="mt-12">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Racepicks Standings
                </p>

                <h2 className="mt-3 text-4xl font-black">
                  {competitionName} Leaderboard
                </h2>
              </div>

              {standingsLeader && (
                <p className="text-sm text-zinc-500">
                  {standings.length} player
                  {standings.length === 1 ? "" : "s"} scored
                </p>
              )}
            </div>

            {standings.length === 0 ? (
              <div className="mt-7 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
                <h3 className="text-xl font-black uppercase">
                  No Rounds Scored Yet
                </h3>

                <p className="mx-auto mt-3 max-w-xl leading-7 text-zinc-500">
                  Standings for this competition will appear here once
                  the first round has been published and scored.
                </p>
              </div>
            ) : (
              <>
                {standingsLeader && (
                  <div className="mt-7 rounded-3xl border border-orange-500/30 bg-orange-500/10 p-6 sm:p-8">
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-5">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-black text-black">
                          1
                        </span>

                        {standingsLeader.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={standingsLeader.avatar_url}
                            alt={standingsLeader.display_name}
                            className="h-14 w-14 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/40 bg-black text-lg font-black text-orange-400">
                            {getInitials(standingsLeader.display_name) ||
                              "RP"}
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-orange-400">
                            Leading This Series
                          </p>

                          <h3 className="mt-2 text-2xl font-black sm:text-3xl">
                            {standingsLeader.display_name}
                            {user &&
                              user.id === standingsLeader.user_id && (
                                <span className="ml-3 rounded-full bg-orange-500 px-3 py-1 align-middle text-xs font-black uppercase text-black">
                                  You
                                </span>
                              )}
                          </h3>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-4xl font-black">
                          {standingsLeader.series_points}
                        </p>

                        <p className="text-xs font-black uppercase tracking-widest text-orange-400">
                          Points
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <section className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                  <div className="hidden grid-cols-[100px_1fr_130px_110px] border-b border-zinc-800 bg-zinc-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 md:grid">
                    <div>Position</div>
                    <div>Player</div>
                    <div className="text-right">Rounds</div>
                    <div className="text-right">Points</div>
                  </div>

                  <div className="divide-y divide-zinc-800">
                    {standings.map((standing, index) => {
                      const position = index + 1;
                      const isYou =
                        user && user.id === standing.user_id;

                      return (
                        <article
                          key={standing.user_id}
                          className={`grid grid-cols-[52px_1fr_auto] items-center gap-3 px-4 py-5 sm:px-6 md:grid-cols-[100px_1fr_130px_110px] ${
                            isYou ? "bg-orange-500/10" : ""
                          }`}
                        >
                          <div>
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${getStandingMedalStyle(
                                position
                              )}`}
                            >
                              {position}
                            </span>
                          </div>

                          <div className="flex min-w-0 items-center gap-3">
                            {standing.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={standing.avatar_url}
                                alt={standing.display_name}
                                className="h-9 w-9 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-black text-[11px] font-black text-zinc-400">
                                {getInitials(standing.display_name) ||
                                  "RP"}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-black sm:text-lg">
                                  {standing.display_name}
                                </p>

                                {isYou && (
                                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                                    You
                                  </span>
                                )}
                              </div>

                              <p className="mt-0.5 text-xs text-zinc-500 md:hidden">
                                {standing.rounds_scored} round
                                {standing.rounds_scored === 1
                                  ? ""
                                  : "s"}
                              </p>
                            </div>
                          </div>

                          <div className="hidden text-right text-sm font-bold text-zinc-500 md:block">
                            {standing.rounds_scored}
                          </div>

                          <div className="text-right">
                            <span className="text-xl font-black">
                              {standing.series_points}
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
              </>
            )}
          </section>

          <section className="mt-12">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Championship Calendar
                </p>

                <h2 className="mt-3 text-4xl font-black">
                  Season Schedule
                </h2>
              </div>

              <p className="text-sm text-zinc-500">
                {events.length} scheduled rounds
              </p>
            </div>

            <div className="mt-7 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
              {events.map((event, index) => {
                const status = getStatusDetails(event.status);
                const multiplier = Number(
                  event.points_multiplier ?? 1
                );

                return (
                  <div
                    key={event.id}
                    className={`grid gap-5 border-zinc-800 p-5 transition hover:bg-zinc-900/60 sm:grid-cols-[80px_1fr_auto] sm:items-center sm:p-6 ${
                      index < events.length - 1
                        ? "border-b"
                        : ""
                    } ${
                      event.status === "open"
                        ? "bg-orange-500/5"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Round
                      </p>

                      <p className="mt-1 text-3xl font-black">
                        {event.round_number}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-black uppercase sm:text-2xl">
                          {event.venue}
                        </h3>

                        {multiplier > 1 && (
                          <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-black">
                            {multiplier}× Points
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-zinc-400">
                        {formatShortDate(event.race_date)}
                        {event.location
                          ? ` • ${event.location}`
                          : ""}
                      </p>

                      {typeof event.wildcard_position ===
                        "number" && (
                        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Wildcard:{" "}
                          {ordinal(event.wildcard_position)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${status.classes}`}
                      >
                        {status.label}
                      </span>

                      {event.status === "open" ? (
                        <Link
                          href="/picks"
                          className="text-sm font-black text-orange-500 transition hover:text-orange-400"
                        >
                          Enter Picks →
                        </Link>
                      ) : isCompletedStatus(event.status) ? (
                        <Link
                          href="/results"
                          className="text-sm font-black text-zinc-400 transition hover:text-white"
                        >
                          Results →
                        </Link>
                      ) : (
                        <span className="text-sm font-bold text-zinc-700">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-12 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                Player Insights
              </p>

              <h3 className="mt-3 text-2xl font-black">
                Championship Stats
              </h3>

              {totalPicksSubmitted === 0 ? (
                <p className="mt-4 leading-7 text-zinc-500">
                  Stats for this competition will appear here once
                  players start submitting picks.
                </p>
              ) : (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Players
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        {totalPlayersParticipated}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Picks Submitted
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        {totalPicksSubmitted}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-zinc-800 bg-black p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Average Round Score
                      </p>
                      <p className="mt-1 text-2xl font-black text-orange-500">
                        {averageRoundScore}
                        <span className="ml-1 text-xs font-bold uppercase text-zinc-600">
                          pts
                        </span>
                      </p>
                    </div>
                  </div>

                  {mostPickedRiders.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Most Picked Riders
                      </p>

                      <div className="mt-3 space-y-2">
                        {mostPickedRiders.map((rider) => (
                          <div
                            key={rider.riderId}
                            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-3"
                          >
                            <p className="min-w-0 truncate text-sm font-bold">
                              #{rider.raceNumber ?? "—"}{" "}
                              {rider.fullName}
                            </p>

                            <p className="shrink-0 text-sm font-black text-orange-500">
                              {rider.pickCount}×
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                Official Championship
              </p>

              <h3 className="mt-3 text-2xl font-black">
                Official Standings
              </h3>

              {officialStandings.length === 0 ? (
                <p className="mt-4 leading-7 text-zinc-500">
                  Official rider championship standings haven&apos;t
                  been imported for this competition yet.
                </p>
              ) : (
                <div className="mt-5 space-y-2">
                  {officialStandings.map((standing) => (
                    <div
                      key={standing.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black px-4 py-3"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          standing.position === 1
                            ? "bg-orange-500 text-black"
                            : "bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        {standing.position}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {standing.rider_name}
                        </p>

                        {(standing.race_number ||
                          standing.manufacturer) && (
                          <p className="truncate text-xs text-zinc-600">
                            {standing.race_number
                              ? `#${standing.race_number}`
                              : ""}
                            {standing.race_number &&
                            standing.manufacturer
                              ? " • "
                              : ""}
                            {standing.manufacturer ?? ""}
                          </p>
                        )}
                      </div>

                      <p className="shrink-0 text-sm font-black">
                        {standing.points}
                        <span className="ml-1 text-[10px] font-bold uppercase text-zinc-600">
                          pts
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}