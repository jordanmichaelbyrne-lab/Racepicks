import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/server";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  manufacturer: string | null;
  team_name: string | null;
};

type PickPosition = {
  label: string;
  rider: Rider | null;
  isWildcard?: boolean;
};

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Player";

  // Find the current event open for picks.
  const { data: currentEvent, error: eventError } = await supabase
    .from("events")
    .select(
      `
        id,
        season,
        series,
        round_number,
        venue,
        race_date,
        status,
        wildcard_position
      `
    )
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message);
  }

  let currentPicks:
    | {
        first_rider_id: string;
        second_rider_id: string;
        third_rider_id: string;
        wildcard_rider_id: string;
        updated_at: string;
      }
    | null = null;

  if (currentEvent) {
    const { data, error } = await supabase
      .from("picks")
      .select(
        `
          first_rider_id,
          second_rider_id,
          third_rider_id,
          wildcard_rider_id,
          updated_at
        `
      )
      .eq("user_id", user.id)
      .eq("event_id", currentEvent.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    currentPicks = data;
  }

  const selectedRiderIds = currentPicks
    ? [
        currentPicks.first_rider_id,
        currentPicks.second_rider_id,
        currentPicks.third_rider_id,
        currentPicks.wildcard_rider_id,
      ]
    : [];

  let selectedRiders: Rider[] = [];

  if (selectedRiderIds.length > 0) {
    const { data, error } = await supabase
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
      .in("id", selectedRiderIds);

    if (error) {
      throw new Error(error.message);
    }

    selectedRiders = (data ?? []) as Rider[];
  }

  function findRider(riderId?: string) {
    if (!riderId) {
      return null;
    }

    return (
      selectedRiders.find((rider) => rider.id === riderId) ?? null
    );
  }

  const displayedPicks: PickPosition[] = currentPicks
    ? [
        {
          label: "1st Place",
          rider: findRider(currentPicks.first_rider_id),
        },
        {
          label: "2nd Place",
          rider: findRider(currentPicks.second_rider_id),
        },
        {
          label: "3rd Place",
          rider: findRider(currentPicks.third_rider_id),
        },
        {
          label: currentEvent?.wildcard_position
            ? `Wildcard — ${currentEvent.wildcard_position}th`
            : "Wildcard",
          rider: findRider(currentPicks.wildcard_rider_id),
          isWildcard: true,
        },
      ]
    : [];

  // Load the player's five most recent submitted events.
  const { data: recentPickRows, error: recentPicksError } =
    await supabase
      .from("picks")
      .select("event_id, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5);

  if (recentPicksError) {
    throw new Error(recentPicksError.message);
  }

  const recentEventIds = Array.from(
    new Set((recentPickRows ?? []).map((pick) => pick.event_id))
  );

  let recentEvents: Array<{
    id: string;
    season: number;
    series: string;
    round_number: number;
    venue: string;
    status: string;
  }> = [];

  if (recentEventIds.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .select(
        `
          id,
          season,
          series,
          round_number,
          venue,
          status
        `
      )
      .in("id", recentEventIds);

    if (error) {
      throw new Error(error.message);
    }

    recentEvents = data ?? [];
  }

  const recentRounds = (recentPickRows ?? [])
    .map((pick) => {
      const event = recentEvents.find(
        (recentEvent) => recentEvent.id === pick.event_id
      );

      if (!event) {
        return null;
      }

      return {
        ...event,
        updatedAt: pick.updated_at,
      };
    })
    .filter(
      (
        event
      ): event is {
        id: string;
        season: number;
        series: string;
        round_number: number;
        venue: string;
        status: string;
        updatedAt: string;
      } => Boolean(event)
    );

  const formattedUpdatedAt = currentPicks
    ? new Intl.DateTimeFormat("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(currentPicks.updated_at))
    : null;
    const activeSeries = currentEvent?.series;

const isSupercrossActive = activeSeries === "Supercross";
const isMotocrossActive = activeSeries === "Motocross";
const isSmxActive = activeSeries === "SMX";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="py-14">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
                Player Dashboard
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
                {displayName}
              </h1>

              <p className="mt-4 text-zinc-400">{user.email}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-full border border-orange-500 px-6 py-3 font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
                >
                  Race Control
                </Link>
              )}

              <Link
                href="/picks"
                className="rounded-full bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400"
              >
                Enter Picks
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
  <div
    className={`rounded-3xl border p-7 ${
      isSupercrossActive
        ? "border-orange-500/40 bg-orange-500/10"
        : "border-zinc-800 bg-zinc-950"
    }`}
  >
    <p
      className={`text-xs font-bold uppercase tracking-widest ${
        isSupercrossActive ? "text-orange-400" : "text-zinc-500"
      }`}
    >
      SX Championship
    </p>

    <p className="mt-3 text-4xl font-black">—</p>

    <p
      className={`mt-2 text-sm ${
        isSupercrossActive
          ? "text-orange-300/70"
          : "text-zinc-500"
      }`}
    >
      Scoring coming soon
    </p>
  </div>

  <div
    className={`rounded-3xl border p-7 ${
      isMotocrossActive
        ? "border-orange-500/40 bg-orange-500/10"
        : "border-zinc-800 bg-zinc-950"
    }`}
  >
    <p
      className={`text-xs font-bold uppercase tracking-widest ${
        isMotocrossActive ? "text-orange-400" : "text-zinc-500"
      }`}
    >
      MX Championship
    </p>

    <p className="mt-3 text-4xl font-black">—</p>

    <p
      className={`mt-2 text-sm ${
        isMotocrossActive
          ? "text-orange-300/70"
          : "text-zinc-500"
      }`}
    >
      Scoring coming soon
    </p>
  </div>

  <div
    className={`rounded-3xl border p-7 ${
      isSmxActive
        ? "border-orange-500/40 bg-orange-500/10"
        : "border-zinc-800 bg-zinc-950"
    }`}
  >
    <p
      className={`text-xs font-bold uppercase tracking-widest ${
        isSmxActive ? "text-orange-400" : "text-zinc-500"
      }`}
    >
      SMX Championship
    </p>

    <p className="mt-3 text-4xl font-black">—</p>

    <p
      className={`mt-2 text-sm ${
        isSmxActive
          ? "text-orange-300/70"
          : "text-zinc-500"
      }`}
    >
      SX + MX + SMX playoffs
    </p>
  </div>
</div>

          <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 md:p-9">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Current Round
                </p>

                <h2 className="mt-3 text-3xl font-black uppercase md:text-5xl">
                  {currentEvent?.venue ?? "No event currently open"}
                </h2>

                {currentEvent && (
                  <p className="mt-3 text-zinc-400">
                    {currentEvent.season} {currentEvent.series} • Round{" "}
                    {currentEvent.round_number}
                  </p>
                )}
              </div>

              {currentEvent && (
                <span className="w-fit rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-green-400">
                  Picks Open
                </span>
              )}
            </div>

            {!currentEvent ? (
              <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-8 text-center">
                <p className="text-zinc-400">
                  The next event will appear here when picks go live.
                </p>
              </div>
            ) : currentPicks ? (
              <>
                <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
                  {displayedPicks.map((pick) => (
                    <div
                      key={pick.label}
                      className={
                        pick.isWildcard
                          ? "flex items-center gap-4 border-t border-orange-500/40 bg-orange-500/10 p-5"
                          : "flex items-center gap-4 border-b border-zinc-800 bg-black p-5 last:border-b-0"
                      }
                    >
                      <div
                        className={
                          pick.isWildcard
                            ? "flex h-14 min-w-16 items-center justify-center rounded-2xl bg-orange-500 px-3 font-black text-black"
                            : "flex h-14 min-w-16 items-center justify-center rounded-2xl bg-zinc-900 px-3 font-black"
                        }
                      >
                        #{pick.rider?.race_number ?? "—"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                          {pick.label}
                        </p>

                        <p className="mt-1 text-xl font-black">
                          {pick.rider?.full_name ?? "Unknown rider"}
                        </p>

                        <p className="mt-1 truncate text-sm text-zinc-400">
                          {pick.rider?.manufacturer ??
                            "Unknown manufacturer"}
                          {pick.rider?.team_name
                            ? ` • ${pick.rider.team_name}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <p className="text-sm text-zinc-500">
                    Last updated: {formattedUpdatedAt}
                  </p>

                  <Link
                    href="/picks"
                    className="rounded-full bg-orange-500 px-7 py-3 text-center font-black text-black transition hover:bg-orange-400"
                  >
                    Edit My Picks
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
                <h3 className="text-2xl font-black text-yellow-300">
                  You haven’t entered yet
                </h3>

                <p className="mt-3 text-zinc-400">
                  Choose your podium riders and wildcard before picks
                  close.
                </p>

                <Link
                  href="/picks"
                  className="mt-6 inline-block rounded-full bg-orange-500 px-7 py-3 font-black text-black transition hover:bg-orange-400"
                >
                  Make My Picks
                </Link>
              </div>
            )}
          </section>

          <section className="mt-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                Pick History
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Recent Rounds
              </h2>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800">
              {recentRounds.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {recentRounds.map((event) => (
                    <div
                      key={`${event.id}-${event.updatedAt}`}
                      className="flex flex-col justify-between gap-4 bg-zinc-950 p-6 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                          {event.season} {event.series} • Round{" "}
                          {event.round_number}
                        </p>

                        <h3 className="mt-2 text-xl font-black uppercase">
                          {event.venue}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          Picks updated{" "}
                          {new Intl.DateTimeFormat("en-AU", {
                            dateStyle: "medium",
                          }).format(new Date(event.updatedAt))}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-black uppercase text-zinc-400">
                          {event.status}
                        </span>

                        <span className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-500">
                          Points pending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-950 p-10 text-center">
                  <h3 className="text-2xl font-black">
                    No pick history yet
                  </h3>

                  <p className="mt-3 text-zinc-400">
                    Your completed and submitted rounds will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}