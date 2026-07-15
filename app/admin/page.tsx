import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/server";

type AdminEvent = {
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
  wildcard_locked: boolean | null;
  status: string;
  points_multiplier: number | string;
  entry_list_stage: string | null;
  provisional_entry_imported_at: string | null;
  final_entry_imported_at: string | null;
};

type StatusItem = {
  label: string;
  description: string;
  complete: boolean;
  active?: boolean;
  href: string;
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
    dateStyle: "full",
  }).format(new Date(date));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/");
  }

  /*
   * Prefer the event currently open for picks.
   * If none is open, display the next upcoming event.
   */
  const { data: openEvent, error: openEventError } = await supabase
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
        wildcard_locked,
        status,
        points_multiplier,
        entry_list_stage,
        provisional_entry_imported_at,
        final_entry_imported_at
      `
    )
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (openEventError) {
    throw new Error(openEventError.message);
  }

  let currentEvent = openEvent as AdminEvent | null;

  if (!currentEvent) {
    const { data: upcomingEvent, error: upcomingEventError } =
      await supabase
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
            wildcard_locked,
            status,
            points_multiplier,
            entry_list_stage,
            provisional_entry_imported_at,
            final_entry_imported_at
          `
        )
        .eq("status", "upcoming")
        .order("race_date", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (upcomingEventError) {
      throw new Error(upcomingEventError.message);
    }

    currentEvent = upcomingEvent as AdminEvent | null;
  }

  let confirmedRiderCount = 0;
  let submittedPickCount = 0;
  let hasResults = false;
  let scoredPlayerCount = 0;

  if (currentEvent) {
    const [
      entryListResponse,
      picksResponse,
      resultsResponse,
      scoresResponse,
    ] = await Promise.all([
      supabase
        .from("event_entries")
        .select("rider_id", {
          count: "exact",
          head: true,
        })
        .eq("event_id", currentEvent.id)
        .eq("confirmed", true),

      supabase
        .from("picks")
        .select("user_id", {
          count: "exact",
          head: true,
        })
        .eq("event_id", currentEvent.id),

      supabase
        .from("results")
        .select("event_id")
        .eq("event_id", currentEvent.id)
        .maybeSingle(),

      supabase
        .from("scores")
        .select("user_id", {
          count: "exact",
          head: true,
        })
        .eq("event_id", currentEvent.id),
    ]);

    if (entryListResponse.error) {
      throw new Error(entryListResponse.error.message);
    }

    if (picksResponse.error) {
      throw new Error(picksResponse.error.message);
    }

    if (resultsResponse.error) {
      throw new Error(resultsResponse.error.message);
    }

    if (scoresResponse.error) {
      throw new Error(scoresResponse.error.message);
    }

    confirmedRiderCount = entryListResponse.count ?? 0;
    submittedPickCount = picksResponse.count ?? 0;
    hasResults = Boolean(resultsResponse.data);
    scoredPlayerCount = scoresResponse.count ?? 0;
  }

  const now = Date.now();

  const picksAreOpen = currentEvent?.status === "open";

  const picksAreClosed = currentEvent
    ? currentEvent.status === "completed" ||
      currentEvent.status === "closed" ||
      new Date(currentEvent.picks_close_at).getTime() <= now
    : false;

  const provisionalImported = Boolean(
    currentEvent?.provisional_entry_imported_at ||
      currentEvent?.entry_list_stage === "provisional" ||
      currentEvent?.entry_list_stage === "final"
  );

  const finalImported = Boolean(
    currentEvent?.final_entry_imported_at ||
      currentEvent?.entry_list_stage === "final"
  );

  const wildcardReady = Boolean(
    currentEvent?.wildcard_position &&
      currentEvent?.wildcard_locked
  );

  const scoresCalculated =
    submittedPickCount > 0 &&
    scoredPlayerCount >= submittedPickCount;

  const eventCompleted =
    currentEvent?.status === "completed" && scoresCalculated;

  const eventStatusItems: StatusItem[] = currentEvent
    ? [
        {
          label: "Provisional Entry List Imported",
          description: provisionalImported
            ? `${confirmedRiderCount} confirmed riders are currently available.`
            : "Import the early entry list so players can begin planning their picks.",
          complete: provisionalImported,
          active: !provisionalImported,
          href: `/admin/entry-list?event=${currentEvent.id}`,
        },
        {
          label: "Wildcard Generated and Locked",
          description: wildcardReady
            ? `${ordinal(
                currentEvent.wildcard_position as number
              )} place is locked for this round.`
            : "Generate and permanently lock the wildcard position.",
          complete: wildcardReady,
          active: provisionalImported && !wildcardReady,
          href: `/admin/wildcard?event=${currentEvent.id}`,
        },
        {
          label: "Picks Open",
          description: picksAreOpen
            ? `${submittedPickCount} player${
                submittedPickCount === 1 ? "" : "s"
              } submitted so far.`
            : "Open picks once the provisional list and wildcard are ready.",
          complete: picksAreOpen || picksAreClosed,
          active:
            provisionalImported &&
            wildcardReady &&
            !picksAreOpen &&
            !picksAreClosed,
          href: "/admin/picks",
        },
        {
          label: "Final Entry List Imported",
          description: finalImported
            ? "The race-weekend rider list has been finalised."
            : "Re-import the latest confirmed list before picks close.",
          complete: finalImported,
          active: picksAreOpen && !finalImported,
          href: `/admin/entry-list?event=${currentEvent.id}`,
        },
        {
          label: "Picks Closed",
          description: picksAreClosed
            ? `${submittedPickCount} player${
                submittedPickCount === 1 ? "" : "s"
              } locked in.`
            : `Scheduled to close ${formatDateTime(
                currentEvent.picks_close_at
              )}.`,
          complete: picksAreClosed,
          active: finalImported && !picksAreClosed,
          href: "/admin/picks",
        },
        {
          label: "Race Results Published",
          description: hasResults
            ? "The official podium and wildcard result have been saved."
            : "Enter the official finishing riders after the race.",
          complete: hasResults,
          active: picksAreClosed && !hasResults,
          href: `/admin/results?event=${currentEvent.id}`,
        },
        {
          label: "Scores Calculated",
          description: scoresCalculated
            ? `${scoredPlayerCount} player${
                scoredPlayerCount === 1 ? "" : "s"
              } scored successfully.`
            : "Calculate points after official results are confirmed.",
          complete: scoresCalculated,
          active: hasResults && !scoresCalculated,
          href: `/admin/results?event=${currentEvent.id}`,
        },
        {
          label: "Event Completed",
          description: eventCompleted
            ? "The round is complete and championship standings are updated."
            : "The event completes after results and scoring are finalised.",
          complete: eventCompleted,
          active: scoresCalculated && !eventCompleted,
          href: `/admin/results?event=${currentEvent.id}`,
        },
      ]
    : [];

  const dashboardActions = [
    {
      title: "Entry List",
      description:
        "Import the provisional list, then update it with the final race-weekend entry list.",
      status: finalImported
        ? "Final"
        : provisionalImported
          ? "Provisional"
          : "Not Imported",
      href: currentEvent
        ? `/admin/entry-list?event=${currentEvent.id}`
        : "/admin/entry-list",
    },
    {
      title: "Wildcard",
      description:
        "View the permanently generated wildcard position for each event.",
      status: currentEvent?.wildcard_position
        ? ordinal(currentEvent.wildcard_position)
        : "Not Generated",
      href: currentEvent
        ? `/admin/wildcard?event=${currentEvent.id}`
        : "/admin/wildcard",
    },
    {
      title: "Picks Control",
      description:
        "Open or close picks and review the number of submitted players.",
      status: picksAreClosed
        ? "Closed"
        : picksAreOpen
          ? `${submittedPickCount} Submitted`
          : "Upcoming",
      href: "/admin/picks",
    },
    {
      title: "Race Results",
      description:
        "Publish official race results and calculate the round scores.",
      status: scoresCalculated
        ? "Scored"
        : hasResults
          ? "Published"
          : "Pending",
      href: currentEvent
        ? `/admin/results?event=${currentEvent.id}`
        : "/admin/results",
    },
    {
      title: "Riders",
      description:
        "Add, edit and maintain the complete 450 rider database.",
      status: "Manage",
      href: "/admin/riders",
    },
    {
      title: "Players",
      description:
        "Review registered users, admin roles and competition participation.",
      status: "Manage",
      href: "/admin/players",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
                Race Control
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
                Admin Dashboard
              </h1>

              <p className="mt-4 text-lg text-zinc-400">
                Welcome, {profile.display_name ?? "Administrator"}.
              </p>
            </div>

            <span className="w-fit rounded-full border border-orange-500/40 bg-orange-500/10 px-5 py-2 text-sm font-black uppercase tracking-wider text-orange-400">
              Administrator
            </span>
          </div>

          {!currentEvent ? (
            <div className="mt-12 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
              <h2 className="text-2xl font-black text-yellow-300">
                No current event found
              </h2>

              <p className="mt-3 text-zinc-400">
                Set an event to upcoming or open before using Race
                Control.
              </p>
            </div>
          ) : (
            <>
              <section className="mt-12 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                <div className="relative p-7 sm:p-9">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                        Current Event
                      </p>

                      <h2 className="mt-3 text-4xl font-black uppercase md:text-6xl">
                        {currentEvent.venue}
                      </h2>

                      <p className="mt-3 text-zinc-400">
                        {currentEvent.season} {currentEvent.series} •
                        Round {currentEvent.round_number}
                        {currentEvent.location
                          ? ` • ${currentEvent.location}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${
                        currentEvent.status === "open"
                          ? "border border-green-500/30 bg-green-500/10 text-green-400"
                          : currentEvent.status === "completed"
                            ? "border border-blue-500/30 bg-blue-500/10 text-blue-400"
                            : "border border-zinc-700 bg-zinc-900 text-zinc-400"
                      }`}
                    >
                      {currentEvent.status}
                    </span>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Race Date
                      </p>

                      <p className="mt-2 font-black">
                        {formatDate(currentEvent.race_date)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                        Wildcard
                      </p>

                      <p className="mt-2 text-3xl font-black">
                        {currentEvent.wildcard_position
                          ? ordinal(currentEvent.wildcard_position)
                          : "Pending"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Picks Close
                      </p>

                      <p className="mt-2 font-black">
                        {formatDateTime(currentEvent.picks_close_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-black p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Submitted Players
                      </p>

                      <p className="mt-2 text-3xl font-black">
                        {submittedPickCount}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                      Race Weekend Status
                    </p>

                    <h2 className="mt-3 text-3xl font-black uppercase">
                      Event Checklist
                    </h2>
                  </div>

                  <p className="text-sm text-zinc-500">
                    Complete each step from top to bottom.
                  </p>
                </div>

                <div className="mt-7 overflow-hidden rounded-2xl border border-zinc-800">
                  {eventStatusItems.map((item, index) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex gap-4 border-b border-zinc-800 p-5 transition last:border-b-0 ${
                        item.active
                          ? "bg-orange-500/10 hover:bg-orange-500/15"
                          : "bg-black hover:bg-zinc-900"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                          item.complete
                            ? "border-green-500/40 bg-green-500/10 text-green-400"
                            : item.active
                              ? "border-orange-500 bg-orange-500 text-black"
                              : "border-zinc-700 bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        {item.complete ? "✓" : index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3
                            className={`font-black ${
                              item.complete
                                ? "text-green-300"
                                : item.active
                                  ? "text-orange-400"
                                  : "text-white"
                            }`}
                          >
                            {item.label}
                          </h3>

                          {item.active && (
                            <span className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                              Next Action
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm leading-6 text-zinc-500">
                          {item.description}
                        </p>
                      </div>

                      <span className="self-center text-zinc-600">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {dashboardActions.map((action) => (
              <div
                key={action.title}
                className="flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-black">
                    {action.title}
                  </h2>

                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-400">
                    {action.status}
                  </span>
                </div>

                <p className="mt-4 flex-1 leading-7 text-zinc-400">
                  {action.description}
                </p>

                <Link
                  href={action.href}
                  className="mt-7 rounded-full border border-zinc-700 px-5 py-3 text-center font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}