import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import {
  closePicks,
  openPicks,
  reopenPicksForFiveMinutes,
} from "./actions";

type EventRow = {
  id: string;
  season: number;
  series: string;
  round_number: number;
  venue: string;
  status: string;
  race_date: string;
  picks_close_at: string;
  wildcard_position: number | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  role: string | null;
};

type PickRow = {
  user_id: string;
  first_rider_id: string;
  second_rider_id: string;
  third_rider_id: string;
  wildcard_rider_id: string;
  updated_at: string;
};

type RiderRow = {
  id: string;
  full_name: string;
  race_number: number | null;
};

type PageProps = {
  searchParams: Promise<{
    event?: string;
    opened?: string;
    closed?: string;
    reopened?: string;
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
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

export default async function AdminPicksPage({
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

  const { data: adminProfile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (adminProfile?.role !== "admin") {
    redirect("/");
  }

  const { data: eventData, error: eventsError } =
    await supabase
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
          picks_close_at,
          wildcard_position
        `
      )
      .order("race_date", { ascending: true });

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const events = (eventData ?? []) as EventRow[];

  const selectedEventId =
    params.event &&
    events.some((event) => event.id === params.event)
      ? params.event
      : events.find((event) => event.status === "open")?.id ??
        events.find(
          (event) =>
            event.status === "upcoming" &&
            new Date(event.race_date).getTime() > Date.now()
        )?.id ??
        events[0]?.id;

  const selectedEvent = events.find(
    (event) => event.id === selectedEventId
  );

  if (!selectedEvent) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <Link href="/admin">← Back to Race Control</Link>

          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <h1 className="text-3xl font-black">
              No events found
            </h1>
          </div>
        </div>
      </main>
    );
  }

  const [
    profilesResponse,
    picksResponse,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, role")
      .order("display_name", { ascending: true }),

    supabase
      .from("picks")
      .select(
        `
          user_id,
          first_rider_id,
          second_rider_id,
          third_rider_id,
          wildcard_rider_id,
          updated_at
        `
      )
      .eq("event_id", selectedEvent.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (profilesResponse.error) {
    throw new Error(profilesResponse.error.message);
  }

  if (picksResponse.error) {
    throw new Error(picksResponse.error.message);
  }

  /*
   * Admin accounts are excluded from the missing-player list.
   * Remove this filter later if admins should also count as players.
   */
  const playerProfiles = (
    (profilesResponse.data ?? []) as ProfileRow[]
  ).filter((profile) => profile.role !== "admin");

  const picks = (picksResponse.data ?? []) as PickRow[];

  const submittedUserIds = new Set(
    picks.map((pick) => pick.user_id)
  );

  const submittedPlayers = playerProfiles.filter((profile) =>
    submittedUserIds.has(profile.id)
  );

  const missingPlayers = playerProfiles.filter(
    (profile) => !submittedUserIds.has(profile.id)
  );

  const riderIds = Array.from(
    new Set(
      picks.flatMap((pick) => [
        pick.first_rider_id,
        pick.second_rider_id,
        pick.third_rider_id,
        pick.wildcard_rider_id,
      ])
    )
  );

  let riders: RiderRow[] = [];

  if (riderIds.length > 0) {
    const { data: riderData, error: riderError } =
      await supabase
        .from("riders")
        .select("id, full_name, race_number")
        .in("id", riderIds);

    if (riderError) {
      throw new Error(riderError.message);
    }

    riders = (riderData ?? []) as RiderRow[];
  }

  function findProfile(userId: string) {
    return (
      playerProfiles.find(
        (profile) => profile.id === userId
      ) ?? null
    );
  }

  function findRider(riderId: string) {
    return (
      riders.find((rider) => rider.id === riderId) ?? null
    );
  }

  const picksAreOpen =
    selectedEvent.status === "open" &&
    new Date(selectedEvent.picks_close_at).getTime() >
      Date.now();

  const submissionPercentage =
    playerProfiles.length > 0
      ? Math.round(
          (submittedPlayers.length / playerProfiles.length) *
            100
        )
      : 0;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
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
            Picks Control
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
            Open and close picks, monitor submissions and inspect
            player selections.
          </p>
        </header>

        {params.opened === "true" && (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 font-bold text-green-300">
            Picks opened successfully.
          </div>
        )}

        {params.closed === "true" && (
          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 font-bold text-yellow-300">
            Picks closed successfully.
          </div>
        )}

        {params.reopened === "true" && (
          <div className="mt-8 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 font-bold text-orange-300">
            Picks reopened for five minutes.
          </div>
        )}

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
              defaultValue={selectedEvent.id}
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 font-bold text-white"
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

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-9">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                {selectedEvent.season} {selectedEvent.series} ·
                Round {selectedEvent.round_number}
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
                {selectedEvent.venue}
              </h2>

              <p className="mt-3 text-zinc-400">
                Picks close{" "}
                {formatDateTime(
                  selectedEvent.picks_close_at
                )}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${
                picksAreOpen
                  ? "border border-green-500/30 bg-green-500/10 text-green-400"
                  : "border border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {picksAreOpen ? "Picks Open" : "Picks Closed"}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Registered Players
              </p>

              <p className="mt-2 text-4xl font-black">
                {playerProfiles.length}
              </p>
            </div>

            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-green-400">
                Submitted
              </p>

              <p className="mt-2 text-4xl font-black">
                {submittedPlayers.length}
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                Missing
              </p>

              <p className="mt-2 text-4xl font-black">
                {missingPlayers.length}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Completion
              </p>

              <p className="mt-2 text-4xl font-black">
                {submissionPercentage}%
              </p>
            </div>
          </div>

          <div className="mt-7 h-3 overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{
                width: `${submissionPercentage}%`,
              }}
            />
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
              Pick Status
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Manual Controls
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Automatic locking still follows the event close time.
              These controls are for setup and emergency overrides.
            </p>

            <div className="mt-6 space-y-3">
              {!picksAreOpen && (
                <form action={openPicks}>
                  <input
                    type="hidden"
                    name="event_id"
                    value={selectedEvent.id}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-full bg-green-500 px-6 py-4 font-black text-black transition hover:bg-green-400"
                  >
                    Open Picks
                  </button>
                </form>
              )}

              {picksAreOpen && (
                <form action={closePicks}>
                  <input
                    type="hidden"
                    name="event_id"
                    value={selectedEvent.id}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-full bg-red-500 px-6 py-4 font-black text-white transition hover:bg-red-400"
                  >
                    Force Close Picks
                  </button>
                </form>
              )}

              {!picksAreOpen && (
                <form action={reopenPicksForFiveMinutes}>
                  <input
                    type="hidden"
                    name="event_id"
                    value={selectedEvent.id}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-full border border-orange-500 px-6 py-4 font-black text-orange-400 transition hover:bg-orange-500 hover:text-black"
                  >
                    Reopen Picks for 5 Minutes
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
              Audit
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Export Picks
            </h2>

            <p className="mt-3 leading-7 text-zinc-400">
              Download every submitted pick for backup, checking or
              dispute resolution.
            </p>

            <Link
              href={`/admin/picks/export?event=${selectedEvent.id}`}
              className="mt-6 block rounded-full border border-zinc-700 px-6 py-4 text-center font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
            >
              Download Picks CSV
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-green-500">
            Submitted Players
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Saved Picks
          </h2>

          <div className="mt-6 space-y-4">
            {picks.length > 0 ? (
              picks.map((pick) => {
                const profile = findProfile(pick.user_id);

                const pickItems = [
                  {
                    label: "1st",
                    rider: findRider(pick.first_rider_id),
                  },
                  {
                    label: "2nd",
                    rider: findRider(pick.second_rider_id),
                  },
                  {
                    label: "3rd",
                    rider: findRider(pick.third_rider_id),
                  },
                  {
                    label: selectedEvent.wildcard_position
                      ? `Wildcard ${ordinal(
                          selectedEvent.wildcard_position
                        )}`
                      : "Wildcard",
                    rider: findRider(
                      pick.wildcard_rider_id
                    ),
                  },
                ];

                return (
                  <article
                    key={pick.user_id}
                    className="rounded-2xl border border-zinc-800 bg-black p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-xl font-black">
                          {profile?.display_name ??
                            "Unnamed Player"}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          Updated{" "}
                          {formatDateTime(pick.updated_at)}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-green-500/10 px-3 py-1 text-xs font-black uppercase text-green-400">
                        Submitted
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {pickItems.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                        >
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                            {item.label}
                          </p>

                          <p className="mt-2 font-black">
                            #
                            {item.rider?.race_number ?? "—"}{" "}
                            {item.rider?.full_name ??
                              "Unknown Rider"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-black p-8 text-center text-zinc-400">
                No players have submitted picks yet.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-yellow-500/30 bg-yellow-500/5 p-7">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-500">
            Missing Players
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Not Submitted
          </h2>

          <div className="mt-6 flex flex-wrap gap-3">
            {missingPlayers.length > 0 ? (
              missingPlayers.map((profile) => (
                <span
                  key={profile.id}
                  className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-300"
                >
                  {profile.display_name ?? "Unnamed Player"}
                </span>
              ))
            ) : (
              <p className="text-green-400">
                Every registered player has submitted.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}