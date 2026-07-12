import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { saveResults, scoreEvent } from "./actions";

type Event = {
  id: string;
  series: string;
  season: number;
  round_number: number;
  venue: string;
  wildcard_position: number;
  status: string;
  race_date: string;
};

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
};

type ExistingResult = {
  first_rider_id: string;
  second_rider_id: string;
  third_rider_id: string;
  wildcard_rider_id: string;
};

type PageProps = {
  searchParams: Promise<{
    event?: string;
    saved?: string;
    scored?: string;
  }>;
};

export default async function AdminResultsPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { data: eventData, error: eventsError } = await supabase
    .from("events")
    .select(
      `
        id,
        series,
        season,
        round_number,
        venue,
        wildcard_position,
        status,
        race_date
      `
    )
    .order("race_date", { ascending: true });

  if (eventsError) {
    console.error("Event loading error:", eventsError);
  }

  const events = (eventData ?? []) as Event[];

  const selectedEventId =
    params.event && events.some((event) => event.id === params.event)
      ? params.event
      : events[0]?.id;

  const selectedEvent = events.find(
    (event) => event.id === selectedEventId
  );

  let riders: Rider[] = [];
  let existingResult: ExistingResult | null = null;

  if (selectedEventId) {
    const { data: entryData, error: entriesError } = await supabase
      .from("event_entries")
      .select(
        `
          rider:riders (
            id,
            full_name,
            race_number,
            team_name,
            manufacturer
          )
        `
      )
      .eq("event_id", selectedEventId)
      .eq("confirmed", true);

    if (entriesError) {
      console.error("Entry-list loading error:", entriesError);
    }

    riders = (entryData ?? [])
      .flatMap((entry) => {
        const rider = entry.rider;

        if (Array.isArray(rider)) {
          return rider;
        }

        return rider ? [rider] : [];
      })
      .sort((a, b) => {
        const numberA = a.race_number ?? Number.MAX_SAFE_INTEGER;
        const numberB = b.race_number ?? Number.MAX_SAFE_INTEGER;

        return numberA - numberB;
      }) as Rider[];

    const { data: resultData } = await supabase
      .from("results")
      .select(
        `
          first_rider_id,
          second_rider_id,
          third_rider_id,
          wildcard_rider_id
        `
      )
      .eq("event_id", selectedEventId)
      .maybeSingle();

    existingResult = resultData as ExistingResult | null;
  }

  const resultFields = selectedEvent
    ? [
        {
          name: "first_rider_id",
          label: "1st Place",
          value: existingResult?.first_rider_id ?? "",
        },
        {
          name: "second_rider_id",
          label: "2nd Place",
          value: existingResult?.second_rider_id ?? "",
        },
        {
          name: "third_rider_id",
          label: "3rd Place",
          value: existingResult?.third_rider_id ?? "",
        },
        {
          name: "wildcard_rider_id",
          label: `Wildcard — ${selectedEvent.wildcard_position}th Place`,
          value: existingResult?.wildcard_rider_id ?? "",
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to admin dashboard
        </Link>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Race Control
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase sm:text-6xl">
            Race Results
          </h1>

          <p className="mt-3 text-sm text-neutral-400">
            Enter the official finishing riders for the selected round.
          </p>
        </header>

        {params.saved === "true" && (
          <div className="mt-8 rounded-xl border border-green-900 bg-green-950/40 px-5 py-4 text-sm font-semibold text-green-400">
            Results saved successfully.
            {params.scored === "true" && (
  <div className="mt-8 rounded-xl border border-orange-900 bg-orange-950/40 px-5 py-4 text-sm font-semibold text-orange-400">
    Round scored successfully. The leaderboard has been updated.
  </div>
)}
          </div>
        )}

        {events.length === 0 ? (
          <section className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-950 p-10 text-center">
            <h2 className="text-2xl font-black uppercase">
              No events found
            </h2>

            <p className="mt-3 text-sm text-neutral-400">
              Create an event before entering results.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <form method="get" className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label
                    htmlFor="event"
                    className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                  >
                    Select Event
                  </label>

                  <select
                    id="event"
                    name="event"
                    defaultValue={selectedEventId}
                    className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                  >
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.season} {event.series} · Round{" "}
                        {event.round_number} · {event.venue}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="self-end rounded-xl border border-orange-500 px-6 py-3 font-bold text-orange-500 transition hover:bg-orange-500 hover:text-black"
                >
                  Load Event
                </button>
              </form>
            </section>

            {selectedEvent && (
              <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                    {selectedEvent.series} · Round{" "}
                    {selectedEvent.round_number}
                  </p>

                  <h2 className="mt-2 text-3xl font-black uppercase">
                    {selectedEvent.venue}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    {riders.length} confirmed riders available
                  </p>
                </div>

                {riders.length === 0 ? (
                  <div className="mt-8 rounded-xl border border-neutral-800 p-8 text-center">
                    <h3 className="text-xl font-bold">
                      No published entry list
                    </h3>

                    <p className="mt-2 text-sm text-neutral-400">
                      Publish the event entry list before entering results.
                    </p>
                  </div>
                ) : (
  <>
    <form action={saveResults} className="mt-8 space-y-5">
      <input
        type="hidden"
        name="event_id"
        value={selectedEvent.id}
      />

      {resultFields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
          >
            {field.label}
          </label>

          <select
            id={field.name}
            name={field.name}
            required
            defaultValue={field.value}
            className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-4 text-lg font-bold outline-none transition focus:border-orange-500"
          >
            <option value="">Select rider</option>

            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                #{rider.race_number ?? "—"} — {rider.full_name}
                {rider.team_name ? ` — ${rider.team_name}` : ""}
              </option>
            ))}
          </select>
        </div>
      ))}

      <button
        type="submit"
        className="w-full rounded-xl bg-orange-500 px-7 py-4 font-black uppercase text-black transition hover:bg-orange-400"
      >
        Publish Results
      </button>
    </form>

    {existingResult && (
      <form action={scoreEvent} className="mt-4">
        <input
          type="hidden"
          name="event_id"
          value={selectedEvent.id}
        />

        <button
          type="submit"
          className="w-full rounded-xl border border-orange-500 px-7 py-4 font-black uppercase text-orange-500 transition hover:bg-orange-500 hover:text-black"
        >
          Calculate Scores
        </button>
      </form>
    )}
  </>
)}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}