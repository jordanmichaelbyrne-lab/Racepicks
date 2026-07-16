import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/app/lib/supabase/server";

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

export default async function CompetitionPage({
  params,
}: PageProps) {
  const { competitionId } = await params;
  const supabase = await createClient();

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
      ? Math.min(
          100,
          Math.round(
            (Math.max(completedRounds, activeRoundNumber - 1) /
              events.length) *
              100
          )
        )
      : 0;

  const currentStatus = liveEvent
    ? "Live"
    : completedRounds === events.length
      ? "Completed"
      : "Upcoming";

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
                      {Math.max(
                        completedRounds,
                        activeRoundNumber - 1
                      )}{" "}
                      / {events.length} rounds
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

          <section className="mt-12 grid gap-5 sm:grid-cols-3">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                Stage 2
              </p>

              <h3 className="mt-3 text-2xl font-black">
                Racepicks Standings
              </h3>

              <p className="mt-3 leading-7 text-zinc-500">
                Competition-specific player standings will appear
                here once championship scoring is connected.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                Stage 2
              </p>

              <h3 className="mt-3 text-2xl font-black">
                Championship Stats
              </h3>

              <p className="mt-3 leading-7 text-zinc-500">
                Player totals, average scores and popular rider picks
                will be added here.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                Stage 3
              </p>

              <h3 className="mt-3 text-2xl font-black">
                Official Standings
              </h3>

              <p className="mt-3 leading-7 text-zinc-500">
                Official rider championship standings will be
                connected later.
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}