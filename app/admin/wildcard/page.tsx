import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import {
  generateAllWildcards,
  generateWildcard,
  resetSeasonWildcards,
} from "./actions";

type EventRow = {
  id: string;
  season: number;
  series: string;
  round_number: number;
  venue: string;
  status: string;
  race_date: string;
  wildcard_position: number | null;
  wildcard_generated_at: string | null;
  wildcard_source: string | null;
  wildcard_locked: boolean | null;
};

type PageProps = {
  searchParams: Promise<{
    event?: string;
    season?: string;
    generated?: string;
    alreadyGenerated?: string;
    locked?: string;
    batchGenerated?: string;
    alreadyLocked?: string;
    reset?: string;
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

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function WildcardAdminPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      `
        id,
        season,
        series,
        round_number,
        venue,
        status,
        race_date,
        wildcard_position,
        wildcard_generated_at,
        wildcard_source,
        wildcard_locked
      `
    )
    .order("race_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const events = (data ?? []) as EventRow[];

  const availableSeasons = Array.from(
    new Set(events.map((event) => event.season))
  ).sort((firstSeason, secondSeason) => firstSeason - secondSeason);

  const openEvent = events.find((event) => event.status === "open");

  const requestedSeason = Number(params.season);

  const selectedSeason =
    Number.isInteger(requestedSeason) &&
    availableSeasons.includes(requestedSeason)
      ? requestedSeason
      : openEvent
        ? openEvent.season
        : availableSeasons.includes(2026)
          ? 2026
          : availableSeasons[0];

  const seasonEvents = events.filter(
    (event) => event.season === selectedSeason
  );

  const selectedEventId =
    params.event &&
    seasonEvents.some((event) => event.id === params.event)
      ? params.event
      : seasonEvents.find((event) => event.status === "open")?.id ??
        seasonEvents[0]?.id;

  const selectedEvent = seasonEvents.find(
    (event) => event.id === selectedEventId
  );

  const generatedSeasonCount = seasonEvents.filter(
    (event) =>
      typeof event.wildcard_position === "number" &&
      event.wildcard_locked === true
  ).length;

  const allSeasonWildcardsLocked =
    seasonEvents.length > 0 &&
    generatedSeasonCount === seasonEvents.length;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="text-sm font-bold text-zinc-400 transition hover:text-orange-500"
        >
          ← Back to Race Control
        </Link>

        <header className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Race Control
          </p>

          <h1 className="mt-3 text-5xl font-black uppercase sm:text-7xl">
            Wildcard
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
            Wildcards are selected automatically from 7th–15th using
            balanced randomness and reduced recent repeats.
          </p>
        </header>

        {params.generated && (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 font-bold text-green-300">
            Wildcard generated and locked successfully:{" "}
            {ordinal(Number(params.generated))}
          </div>
        )}

        {params.batchGenerated && (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 font-bold text-green-300">
            {selectedSeason} season wildcards generated and locked
            successfully. {params.batchGenerated} events were updated.
          </div>
        )}

        {params.alreadyLocked === "true" && (
          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 font-bold text-yellow-300">
            Every wildcard for the {selectedSeason} season is already
            generated and locked.
          </div>
        )}

        {params.alreadyGenerated === "true" && (
          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 font-bold text-yellow-300">
            This event already has a wildcard position.
          </div>
        )}

        {params.locked === "true" && (
          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 font-bold text-yellow-300">
            This wildcard has already been permanently locked.
          </div>
        )}

        {params.reset && (
          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 font-bold text-yellow-300">
            {selectedSeason} season wildcards reset successfully.{" "}
            {params.reset} events are ready to generate again.
          </div>
        )}

        {events.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <h2 className="text-2xl font-black">No events found</h2>

            <p className="mt-3 text-zinc-500">
              Add a season calendar before generating wildcards.
            </p>
          </div>
        ) : (
          <>
            <form
              method="get"
              className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <label
                htmlFor="season"
                className="text-xs font-bold uppercase tracking-widest text-zinc-500"
              >
                Select Season
              </label>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <select
                  id="season"
                  name="season"
                  defaultValue={selectedSeason}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 font-bold text-white"
                >
                  {availableSeasons.map((season) => (
                    <option key={season} value={season}>
                      {season} Season
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="rounded-xl border border-orange-500 px-6 py-3 font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
                >
                  Load Season
                </button>
              </div>
            </form>

            <section className="mt-6 rounded-3xl border border-orange-500/40 bg-orange-500/10 p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
                    Season Setup
                  </p>

                  <h2 className="mt-3 text-2xl font-black uppercase sm:text-3xl">
                    Generate All {selectedSeason} Wildcards
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                    Generates balanced wildcard positions for every
                    event in the {selectedSeason} season. Once
                    generated, each wildcard is locked.
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase ${
                    allSeasonWildcardsLocked
                      ? "border border-green-500/30 bg-green-500/10 text-green-400"
                      : "border border-orange-500/30 bg-orange-500/10 text-orange-400"
                  }`}
                >
                  {generatedSeasonCount}/{seasonEvents.length} Locked
                </span>
              </div>

              {allSeasonWildcardsLocked ? (
                <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-center">
                  <p className="font-black text-green-300">
                    Season Wildcards Locked
                  </p>

                  <p className="mt-2 text-sm text-zinc-400">
                    Every {selectedSeason} event has a permanent
                    wildcard position.
                  </p>
                </div>
              ) : (
                <form action={generateAllWildcards} className="mt-6">
                  <input
                    type="hidden"
                    name="season"
                    value={selectedSeason}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-full bg-orange-500 px-7 py-4 font-black text-black transition hover:bg-orange-400"
                  >
                    Generate & Lock All {selectedSeason} Wildcards
                  </button>
                </form>
              )}

              <p className="mt-3 text-center text-xs font-bold text-orange-300/70">
                Only run this when you are ready to permanently set the
                season.
              </p>
            </section>

            <form
              method="get"
              className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <input
                type="hidden"
                name="season"
                value={selectedSeason}
              />

              <label
                htmlFor="event"
                className="text-xs font-bold uppercase tracking-widest text-zinc-500"
              >
                Select Event
              </label>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <select
                  id="event"
                  name="event"
                  defaultValue={selectedEventId}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 font-bold text-white"
                >
                  {seasonEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.season} {event.series} · Round{" "}
                      {event.round_number} · {event.venue}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="rounded-xl border border-orange-500 px-6 py-3 font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
                >
                  Load Event
                </button>
              </div>
            </form>

            {selectedEvent && (
              <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-9">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-orange-500">
                      {selectedEvent.season} {selectedEvent.series} ·
                      Round {selectedEvent.round_number}
                    </p>

                    <h2 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
                      {selectedEvent.venue}
                    </h2>

                    <p className="mt-3 text-sm uppercase text-zinc-500">
                      Status: {selectedEvent.status}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase ${
                      selectedEvent.wildcard_locked
                        ? "border border-green-500/30 bg-green-500/10 text-green-400"
                        : "border border-zinc-700 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {selectedEvent.wildcard_locked
                      ? "Locked"
                      : "Not Generated"}
                  </span>
                </div>

                <div className="mt-8 rounded-3xl border border-orange-500/40 bg-orange-500/10 p-8 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
                    Wildcard Position
                  </p>

                  <p className="mt-4 text-7xl font-black">
                    {typeof selectedEvent.wildcard_position === "number"
                      ? ordinal(selectedEvent.wildcard_position)
                      : "—"}
                  </p>

                  <p className="mt-3 text-sm text-zinc-500">
                    {selectedEvent.wildcard_generated_at
                      ? `Generated ${formatDateTime(
                          selectedEvent.wildcard_generated_at
                        )}`
                      : "This event does not have a wildcard yet."}
                  </p>
                </div>

                {selectedEvent.wildcard_locked &&
                typeof selectedEvent.wildcard_position === "number" ? (
                  <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-center">
                    <p className="font-black text-green-300">
                      Wildcard Locked
                    </p>

                    <p className="mt-2 text-sm text-zinc-400">
                      This wildcard has been permanently set for the
                      round.
                    </p>
                  </div>
                ) : (
                  <form action={generateWildcard} className="mt-6">
                    <input
                      type="hidden"
                      name="event_id"
                      value={selectedEvent.id}
                    />

                    <button
                      type="submit"
                      className="w-full rounded-full bg-orange-500 px-7 py-4 font-black text-black transition hover:bg-orange-400"
                    >
                      Generate & Lock Wildcard
                    </button>
                  </form>
                )}
              </section>
            )}

            <section className="mt-8 rounded-3xl border border-red-500/30 bg-red-500/5 p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
                Admin Recovery
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase">
                Reset {selectedSeason} Wildcards
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Clears every {selectedSeason} wildcard and unlocks the
                season so a fresh balanced set can be generated. Events,
                entries, picks, results and scores are not deleted.
              </p>

              <form action={resetSeasonWildcards} className="mt-6">
                <input
                  type="hidden"
                  name="season"
                  value={selectedSeason}
                />

                <label className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-black p-4">
                  <input
                    type="checkbox"
                    name="confirm_reset"
                    value="confirmed"
                    required
                    className="mt-1 h-4 w-4 accent-red-500"
                  />

                  <span className="text-sm text-zinc-400">
                    I understand this will clear and unlock every{" "}
                    {selectedSeason} wildcard position.
                  </span>
                </label>

                <button
                  type="submit"
                  className="mt-4 w-full rounded-full border border-red-500/50 px-7 py-4 font-black text-red-400 transition hover:bg-red-500 hover:text-white"
                >
                  Reset All {selectedSeason} Wildcards
                </button>
              </form>
            </section>
          </>
        )}
      </div>
    </main>
  );
}