import Link from "next/link";
import Countdown from "./components/Countdown";
import Navbar from "./components/Navbar";
import { createClient } from "./lib/supabase/server";

type HomeEvent = {
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
};

type SeasonEventRow = {
  competition_slug: string;
  series: string;
  season: number;
  round_number: number;
  status: string;
};

type SeasonCompetition = {
  slug: string;
  series: string;
  season: number;
  title: string;
  description: string;
  roundCount: number;
  status: "Live" | "Completed" | "Upcoming";
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

function formatRaceDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

function formatPickCloseTime(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

function getSeriesLabel(event: HomeEvent) {
  if (event.series === "Motocross") {
    return `${event.season} Pro Motocross`;
  }

  if (event.series === "SMX") {
    return `${event.season} SMX Championship`;
  }

  if (event.series === "Supercross") {
    return `${event.season} Supercross`;
  }

  return `${event.season} ${event.series}`;
}

function getEventBackground() {
  return "/images/tracks/smx-hero.jpeg";
}

export default async function Home() {
  const supabase = await createClient();

  const eventFields = `
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
    status
  `;

  /*
   * First preference:
   * show the event currently open in Race Control.
   */
  const { data: openEvent, error: openEventError } = await supabase
    .from("events")
    .select(eventFields)
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (openEventError) {
    throw new Error(openEventError.message);
  }

  let currentEvent = openEvent as HomeEvent | null;

  /*
   * If no event is open, show the earliest future upcoming event.
   */
  if (!currentEvent) {
    const { data: upcomingEvent, error: upcomingEventError } =
      await supabase
        .from("events")
        .select(eventFields)
        .eq("status", "upcoming")
        .gte("race_date", new Date().toISOString())
        .order("race_date", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (upcomingEventError) {
      throw new Error(upcomingEventError.message);
    }

    currentEvent = upcomingEvent as HomeEvent | null;
  }

  /*
   * Render a safe fallback before accessing currentEvent.season.
   */
  if (!currentEvent) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Navbar />

          <section className="flex min-h-[75vh] flex-col items-center justify-center text-center">
            <p className="text-sm font-black uppercase tracking-[0.4em] text-orange-500">
              Racepicks
            </p>

            <h1 className="mt-5 text-5xl font-black sm:text-7xl">
              No upcoming event
            </h1>

            <p className="mt-5 max-w-xl text-lg text-zinc-400">
              The next race will appear here once it has been added or
              opened through Race Control.
            </p>

            <Link
              href="/leaderboard"
              className="mt-8 rounded-full border border-zinc-700 px-8 py-4 font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
            >
              View Leaderboard
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const activeSeason = currentEvent.season;

  /*
   * Load all competitions belonging to the active season.
   */
  const { data: seasonEventRows, error: seasonEventsError } =
    await supabase
      .from("events")
      .select(
        `
          competition_slug,
          series,
          season,
          round_number,
          status
        `
      )
      .eq("season", activeSeason)
      .order("race_date", { ascending: true });

  if (seasonEventsError) {
    throw new Error(seasonEventsError.message);
  }

  const typedSeasonEvents =
    (seasonEventRows ?? []) as SeasonEventRow[];

  const seriesDescriptions: Record<string, string> = {
    Supercross: "Stadium racing from January through May.",
    Motocross: "The Pro Motocross outdoor championship.",
    SMX: "The season-ending SuperMotocross playoffs.",
  };

  const seriesTitles: Record<string, string> = {
    Supercross: `${activeSeason} Supercross`,
    Motocross: `${activeSeason} Motocross`,
    SMX: `${activeSeason} SMX Championship`,
  };

  const uniqueCompetitions = Array.from(
    new Map(
      typedSeasonEvents.map((event) => [
        event.competition_slug,
        {
          slug: event.competition_slug,
          series: event.series,
          season: event.season,
        },
      ])
    ).values()
  );

  const seasonCompetitions: SeasonCompetition[] =
    uniqueCompetitions.map((competition) => {
      const competitionEvents = typedSeasonEvents.filter(
        (event) =>
          event.competition_slug === competition.slug
      );

      const hasOpenEvent = competitionEvents.some(
        (event) => event.status === "open"
      );

      const allCompleted =
        competitionEvents.length > 0 &&
        competitionEvents.every(
          (event) => event.status === "completed"
        );

      return {
        ...competition,
        title:
          seriesTitles[competition.series] ??
          `${competition.season} ${competition.series}`,
        description:
          seriesDescriptions[competition.series] ??
          "Racepicks championship competition.",
        roundCount: competitionEvents.length,
        status: hasOpenEvent
          ? "Live"
          : allCompleted
            ? "Completed"
            : "Upcoming",
      };
    });

  const backgroundImage = getEventBackground();
  const picksAreOpen = currentEvent.status === "open";

  return (
    <main className="min-h-screen bg-black text-white">
      <section
        className="relative min-h-screen overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8">
          <Navbar />

          <div className="flex flex-1 flex-col items-center justify-center py-14 text-center sm:py-16">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.4em] text-orange-500">
              {picksAreOpen ? "Current Event" : "Next Event"}
            </p>

            <p className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-zinc-300">
              {getSeriesLabel(currentEvent)}
            </p>

            <h1 className="max-w-5xl text-6xl font-black uppercase leading-none tracking-tight sm:text-7xl md:text-8xl lg:text-9xl">
              {currentEvent.venue}
            </h1>

            <p className="mt-6 text-lg font-medium text-zinc-300 md:text-2xl">
              Round {currentEvent.round_number}
              {currentEvent.location
                ? ` • ${currentEvent.location}`
                : ""}
            </p>

            <div className="mt-10 grid w-full max-w-5xl gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/15 bg-black/45 p-6 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                  Race Date
                </p>

                <p className="mt-3 text-xl font-black sm:text-2xl">
                  {formatRaceDate(currentEvent.race_date)}
                </p>
              </div>

              <div className="rounded-3xl border border-orange-500/60 bg-orange-500/15 p-6 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">
                  Wildcard Position
                </p>

                <p className="mt-3 text-5xl font-black">
                  {typeof currentEvent.wildcard_position === "number"
                    ? ordinal(currentEvent.wildcard_position)
                    : "Pending"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-black/45 p-6 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                  Picks Close
                </p>

                <p className="mt-3 text-2xl font-black">
                  {formatPickCloseTime(
                    currentEvent.picks_close_at
                  )}
                </p>

                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Brisbane time
                </p>
              </div>
            </div>

            <div className="mt-8 w-full max-w-3xl rounded-3xl border border-white/15 bg-black/55 px-5 py-7 backdrop-blur-lg sm:px-6 sm:py-8 md:px-10">
              <p className="mb-6 text-sm font-black uppercase tracking-[0.4em] text-orange-500">
                Picks Close In
              </p>

              <Countdown
                targetDate={currentEvent.picks_close_at}
              />
            </div>

            <p className="mt-8 max-w-3xl text-base leading-7 text-zinc-300 md:text-xl">
              Pick your 1st, 2nd and 3rd place riders, then choose the
              rider you believe will finish in the wildcard position.
              Correct picks earn points toward the Racepicks
              leaderboard.
            </p>

            <div className="mt-8 flex w-full max-w-sm flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href="/picks"
                className="rounded-full bg-orange-500 px-10 py-4 text-center text-lg font-black text-black transition hover:scale-105 hover:bg-orange-400"
              >
                {picksAreOpen ? "Enter Picks" : "View Picks"}
              </Link>

              <Link
                href="/leaderboard"
                className="rounded-full border border-white/25 bg-black/30 px-10 py-4 text-center text-lg font-black text-white backdrop-blur transition hover:scale-105 hover:bg-white/10"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            {activeSeason} Championship Series
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Choose a Competition
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Follow the current event from the homepage or browse each
            championship separately.
          </p>
        </div>

        <div
          className={`mt-12 grid gap-6 ${
            seasonCompetitions.length === 2
              ? "mx-auto max-w-4xl md:grid-cols-2"
              : "lg:grid-cols-3"
          }`}
        >
          {seasonCompetitions.map((competition) => (
            <div
              key={competition.slug}
              className="flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:-translate-y-1 hover:border-orange-500/50"
            >
              <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
                {competition.season}
              </p>

              <h3 className="mt-4 text-3xl font-black">
                {competition.title}
              </h3>

              <p className="mt-4 flex-1 leading-7 text-zinc-400">
                {competition.description}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-6">
                <span className="font-bold text-zinc-300">
                  {competition.roundCount}{" "}
                  {competition.roundCount === 1
                    ? "Round"
                    : "Rounds"}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    competition.status === "Live"
                      ? "bg-green-500/10 text-green-400"
                      : competition.status === "Completed"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {competition.status}
                </span>
              </div>

              <Link
                href={`/competitions/${competition.slug}`}
                className="mt-8 rounded-full border border-zinc-700 px-6 py-3 text-center font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
              >
                View Competition
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}