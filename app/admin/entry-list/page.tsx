import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import {
  importRacerXEntryList,
  saveEventEntries,
} from "./actions";

type Event = {
  id: string;
  series: string;
  season: number;
  round_number: number;
  venue: string;
  status: string;
  race_date: string;
  entry_list_stage: string | null;
  provisional_entry_imported_at: string | null;
  final_entry_imported_at: string | null;
};

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
  nationality: string | null;
  class_name: string;
};

type PageProps = {
  searchParams: Promise<{
    event?: string;
    saved?: string;
    imported?: string;
    importError?: string;
    stage?: string;
  }>;
};

function formatDateTime(date: string | null) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

export default async function EntryListPage({
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
        status,
        race_date,
        entry_list_stage,
        provisional_entry_imported_at,
        final_entry_imported_at
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

  const { data: riderData, error: ridersError } = await supabase
    .from("riders")
    .select(
      `
        id,
        full_name,
        race_number,
        team_name,
        manufacturer,
        nationality,
        class_name
      `
    )
    .eq("is_active", true)
    .eq("class_name", "450")
    .order("race_number", { ascending: true })
    .order("full_name", { ascending: true });

  if (ridersError) {
    console.error("Rider loading error:", ridersError);
  }

  const riders = (riderData ?? []) as Rider[];

  let enteredRiderIds = new Set<string>();

  if (selectedEventId) {
    const { data: entryData, error: entriesError } = await supabase
      .from("event_entries")
      .select("rider_id")
      .eq("event_id", selectedEventId)
      .eq("confirmed", true);

    if (entriesError) {
      console.error("Entry list loading error:", entriesError);
    }

    enteredRiderIds = new Set(
      (entryData ?? []).map((entry) => entry.rider_id)
    );
  }

  const listIsFinal =
    selectedEvent?.entry_list_stage === "final" ||
    Boolean(selectedEvent?.final_entry_imported_at);

  const listIsProvisional =
    !listIsFinal &&
    (selectedEvent?.entry_list_stage === "provisional" ||
      Boolean(selectedEvent?.provisional_entry_imported_at));

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
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
            Entry List
          </h1>

          <p className="mt-3 text-sm text-neutral-400">
            Import, review and publish the confirmed 450 riders for
            each race weekend.
          </p>
        </header>

        {params.saved === "true" &&
          params.stage === "provisional" && (
            <div className="mt-8 rounded-xl border border-green-900 bg-green-950/40 px-5 py-4 text-sm font-semibold text-green-400">
              Provisional entry list saved successfully.
            </div>
          )}

        {params.saved === "true" && params.stage === "final" && (
          <div className="mt-8 rounded-xl border border-green-500/40 bg-green-500/10 px-5 py-4 text-sm font-semibold text-green-300">
            Final entry list published successfully. The Admin
            Dashboard checklist has been updated.
          </div>
        )}

        {params.imported && (
          <div className="mt-8 rounded-xl border border-green-900 bg-green-950/40 px-5 py-4 text-sm font-semibold text-green-400">
            Racer X import completed successfully. {params.imported}{" "}
            riders were imported and selected for this event.
          </div>
        )}

        {params.importError && (
          <div className="mt-8 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-sm font-semibold text-red-400">
            Import failed: {params.importError}
          </div>
        )}

        {events.length === 0 ? (
          <section className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-950 p-10 text-center">
            <h2 className="text-2xl font-black uppercase">
              No events found
            </h2>

            <p className="mt-3 text-sm text-neutral-400">
              Create your first event before publishing an entry list.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <form
                method="get"
                className="flex flex-col gap-4 sm:flex-row"
              >
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
              <section className="mt-8">
                <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                        Current List Status
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider ${
                            listIsFinal
                              ? "border-green-500/40 bg-green-500/10 text-green-400"
                              : listIsProvisional
                                ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                                : "border-neutral-700 bg-neutral-900 text-neutral-400"
                          }`}
                        >
                          {listIsFinal
                            ? "Final"
                            : listIsProvisional
                              ? "Provisional"
                              : "Not Published"}
                        </span>

                        <span className="text-sm text-neutral-500">
                          {listIsFinal
                            ? formatDateTime(
                                selectedEvent.final_entry_imported_at
                              )
                            : listIsProvisional
                              ? formatDateTime(
                                  selectedEvent.provisional_entry_imported_at
                                )
                              : "No entry list has been published yet."}
                        </span>
                      </div>
                    </div>

                    {listIsFinal && (
                      <span className="text-sm font-bold text-green-400">
                        ✓ Final gate published
                      </span>
                    )}
                  </div>
                </section>

                <form
                  action={importRacerXEntryList}
                  className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
                >
                  <input
                    type="hidden"
                    name="event_id"
                    value={selectedEvent.id}
                  />

                  <label
                    htmlFor="entry_list_url"
                    className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                  >
                    Racer X Entry List URL
                  </label>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      id="entry_list_url"
                      name="entry_list_url"
                      type="url"
                      required
                      placeholder="https://racerxonline.com/mx/2026/southwick/450/entry-list"
                      className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-orange-500 px-7 py-3 font-black uppercase text-black transition hover:bg-orange-400"
                    >
                      Import Entry List
                    </button>
                  </div>

                  <p className="mt-3 text-sm text-neutral-500">
                    This updates the master rider database and replaces
                    the selected event’s current rider selections.
                    Review the list before saving or publishing it.
                  </p>
                </form>

                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                      {selectedEvent.series} · Round{" "}
                      {selectedEvent.round_number}
                    </p>

                    <h2 className="mt-2 text-3xl font-black uppercase">
                      {selectedEvent.venue}
                    </h2>

                    <p className="mt-1 text-sm text-neutral-500">
                      {enteredRiderIds.size} confirmed riders
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold uppercase text-neutral-400">
                    {selectedEvent.status}
                  </span>
                </div>

                <form action={saveEventEntries}>
                  <input
                    type="hidden"
                    name="event_id"
                    value={selectedEvent.id}
                  />

                  <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
                    {riders.length === 0 ? (
                      <div className="p-10 text-center">
                        <h3 className="text-xl font-bold">
                          No active 450 riders
                        </h3>

                        <p className="mt-2 text-sm text-neutral-400">
                          Add riders in the Rider Manager first.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-800">
                        {riders.map((rider) => (
                          <label
                            key={rider.id}
                            className="flex cursor-pointer items-center gap-4 px-5 py-4 transition hover:bg-neutral-900"
                          >
                            <input
                              type="checkbox"
                              name="rider_ids"
                              value={rider.id}
                              defaultChecked={enteredRiderIds.has(
                                rider.id
                              )}
                              className="h-5 w-5 accent-orange-500"
                            />

                            <div className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-orange-500 px-2 font-black text-black">
                              #{rider.race_number ?? "—"}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-black">
                                {rider.full_name}
                              </p>

                              <p className="truncate text-sm text-neutral-400">
                                {rider.manufacturer ??
                                  "Unknown manufacturer"}
                                {rider.team_name
                                  ? ` · ${rider.team_name}`
                                  : ""}
                              </p>
                            </div>

                            <span className="hidden rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold uppercase text-neutral-500 sm:inline">
                              {rider.class_name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <button
                      type="submit"
                      name="publication_stage"
                      value="provisional"
                      disabled={listIsFinal}
                      className="rounded-xl border border-neutral-700 px-7 py-3 font-black uppercase text-white transition hover:border-orange-500 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {listIsFinal
                        ? "Provisional Stage Complete"
                        : "Save Provisional List"}
                    </button>

                    <button
                      type="submit"
                      name="publication_stage"
                      value="final"
                      className="rounded-xl bg-orange-500 px-7 py-3 font-black uppercase text-black transition hover:bg-orange-400"
                    >
                      {listIsFinal
                        ? "Republish Final Entry List"
                        : "Publish Final Entry List"}
                    </button>

                    <Link
                      href="/admin/riders"
                      className="rounded-xl border border-neutral-700 px-7 py-3 text-center font-bold transition hover:border-orange-500 hover:text-orange-500"
                    >
                      Manage Riders
                    </Link>
                  </div>

                  {!listIsFinal && (
                    <div className="mt-5 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                      <p className="text-sm font-bold text-orange-300">
                        Publish Final Entry List only after you have
                        reviewed the latest race-weekend list.
                      </p>

                      <p className="mt-1 text-sm leading-6 text-neutral-400">
                        Publishing the final list will complete Step 4
                        on the Admin Dashboard checklist.
                      </p>
                    </div>
                  )}
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}