import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/server";
import PicksForm from "./PicksForm";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
};

type EventEntry = {
  rider: Rider | Rider[] | null;
};

export default async function PicksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find the next event currently open for picks.
  const { data: currentEvent, error: eventError } = await supabase
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
        wildcard_position,
        points_multiplier
      `
    )
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message);
  }

  if (!currentEvent) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Navbar />

          <section className="mx-auto max-w-3xl py-20 text-center">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
              Racepicks
            </p>

            <h1 className="mt-4 text-5xl font-black">
              Picks are currently closed
            </h1>

            <p className="mt-5 text-lg text-zinc-400">
              The next event will appear here when picks go live.
            </p>

            <Link
              href="/"
              className="mt-8 inline-block rounded-full border border-zinc-700 px-7 py-3 font-black transition hover:border-orange-500"
            >
              Back to Homepage
            </Link>
          </section>
        </div>
      </main>
    );
  }

  // Load the confirmed riders for this exact event.
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
    .eq("event_id", currentEvent.id)
    .eq("confirmed", true);

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const entries = (entryData ?? []) as EventEntry[];

  const riders: Rider[] = entries
    .map((entry) => {
      if (Array.isArray(entry.rider)) {
        return entry.rider[0] ?? null;
      }

      return entry.rider;
    })
    .filter((rider): rider is Rider => Boolean(rider))
    .sort((firstRider, secondRider) => {
      const firstNumber = firstRider.race_number ?? 9999;
      const secondNumber = secondRider.race_number ?? 9999;

      return firstNumber - secondNumber;
    });

  const wildcardPosition = currentEvent.wildcard_position;
  const pointsMultiplier = Number(currentEvent.points_multiplier ?? 1);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto max-w-3xl py-14">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Enter Picks
          </p>

          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight md:text-7xl">
            {currentEvent.venue}
          </h1>

          <p className="mt-4 text-lg text-zinc-400">
            {currentEvent.season} {currentEvent.series} • Round{" "}
            {currentEvent.round_number}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Riders Available
              </p>

              <p className="mt-3 text-4xl font-black">{riders.length}</p>
            </div>

            <div className="rounded-3xl border border-orange-500/40 bg-orange-500/10 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Wildcard
              </p>

              <p className="mt-3 text-4xl font-black">
                {wildcardPosition
                  ? `${wildcardPosition}th`
                  : "Pending"}
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Multiplier
              </p>

              <p className="mt-3 text-4xl font-black">
                {pointsMultiplier}×
              </p>
            </div>
          </div>

          {riders.length >= 4 && wildcardPosition ? (
            <PicksForm
  eventId={currentEvent.id}
  riders={riders}
  wildcardPosition={wildcardPosition}
/>
          ) : (
            <div className="mt-10 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
              <h2 className="text-2xl font-black text-yellow-300">
                Entry list not ready
              </h2>

              <p className="mt-3 text-zinc-400">
                At least four confirmed riders and a wildcard position are
                required before players can submit picks.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}