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
  wildcard_locked: boolean;
};

type PageProps = {
  searchParams: Promise<{
    event?: string;
    generated?: string;
    alreadyGenerated?: string;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

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

  const selectedEventId =
    params.event &&
    events.some((event) => event.id === params.event)
      ? params.event
      : events.find((event) => event.status === "open")?.id ??
        events[0]?.id;

  const selectedEvent = events.find(
    (event) => event.id === selectedEventId
  );

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
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

          <h1 className="mt-3 text-4xl font-black uppercase sm:text-6xl">
            Wildcard
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Wildcards are selected automatically from 7th–15th using
            balanced randomness and reduced recent repeats.
          </p>
        </header>

        {params.generated && (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 font-bold text-green-300">
            Wildcard generated successfully:{" "}
            {ordinal(Number(params.generated))}
          </div>
        )}

        {params.alreadyGenerated === "true" && (
          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 font-bold text-yellow-300">
            This event already has a wildcard. Use Regenerate only if
            there is an admin correction.
          </div>
        )}

        {events.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            No events were found.
          </div>
        ) : (
          <>
            <form
              method="get"
              className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
            >
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
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
                >
                  {events.map((event) => (
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

<section className="mt-10 rounded-3xl border border-orange-500/40 bg-orange-500/10 p-6 sm:p-8">
  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
    Season Setup
  </p>

  <h2 className="mt-3 text-2xl font-black uppercase sm:text-3xl">
    Generate All 2027 Wildcards
  </h2>

  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
    Generates balanced wildcard positions for every Supercross,
    Motocross and SMX round. Once generated, each wildcard is locked
    and cannot be changed through Race Control.
  </p>

  <form action={generateAllWildcards} className="mt-6">
  <input type="hidden" name="season" value="2027" />

  <button
    type="submit"
    className="w-full rounded-full bg-orange-500 px-7 py-4 font-black text-black transition hover:bg-orange-400"
  >
    Generate & Lock All 2027 Wildcards
  </button>
</form>

  <p className="mt-3 text-center text-xs font-bold text-orange-300/70">
    Only run this when you are ready to permanently set the season.
  </p>
</section>

            {selectedEvent && (
              <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-9">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-orange-500">
                      {selectedEvent.season} {selectedEvent.series} ·
                      Round {selectedEvent.round_number}
                    </p>

                    <h2 className="mt-3 text-3xl font-black uppercase sm:text-5xl">
                      {selectedEvent.venue}
                    </h2>

                    <p className="mt-3 text-sm uppercase text-zinc-500">
                      Status: {selectedEvent.status}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-zinc-900 px-4 py-2 text-xs font-black uppercase text-zinc-400">
                    {selectedEvent.wildcard_source ??
                      "Not generated"}
                  </span>
                </div>

                <div className="mt-8 rounded-3xl border border-orange-500/40 bg-orange-500/10 p-8 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
                    Wildcard Position
                  </p>

                  <p className="mt-4 text-7xl font-black">
                    {selectedEvent.wildcard_position
                      ? ordinal(selectedEvent.wildcard_position)
                      : "—"}
                  </p>

                  <p className="mt-3 text-sm text-zinc-500">
                    {selectedEvent.wildcard_generated_at
                      ? `Generated ${new Intl.DateTimeFormat(
                          "en-AU",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }
                        ).format(
                          new Date(
                            selectedEvent.wildcard_generated_at
                          )
                        )}`
                      : "The wildcard will be generated when picks open."}
                  </p>
                </div>

                {selectedEvent.wildcard_locked ? (

  <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-center">

    <p className="font-black text-green-300">
      Wildcard Locked
    </p>

    <p className="mt-2 text-sm text-zinc-400">
      This wildcard has already been generated for this round.
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
          </>
        )}
      </div>
    </main>
  );
}