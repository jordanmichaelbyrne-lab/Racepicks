"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { races } from "../data/races";
import { createClient } from "../lib/supabase/client";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
};

type PickKey = "first" | "second" | "third" | "wildcard";

type Picks = Record<PickKey, string>;

export default function PicksPage() {
  const nextRace = races[0];
  const picksLocked =
  new Date(nextRace.pickLock).getTime() <= Date.now();
  const supabase = createClient();
  const [availableRiders, setAvailableRiders] = useState<Rider[]>([]);
  useEffect(() => {
  async function loadRiders() {
    const { data } = await supabase
  .from("event_entries")
  .select(`
    rider:riders (
      id,
      full_name,
      race_number,
      team_name
    )
  `)
  .eq("confirmed", true);

    if (data) {
  setAvailableRiders(
    data.map((entry) => entry.rider).filter(Boolean)
  );
}
  }

  loadRiders();
}, []);

  const [picks, setPicks] = useState<Picks>({
    first: "",
    second: "",
    third: "",
    wildcard: "",
  });

  const [message, setMessage] = useState("");

  function updatePick(key: PickKey, riderName: string) {
    setPicks((current) => ({
      ...current,
      [key]: riderName,
    }));

    setMessage("");
  }

  function submitPicks() {
    const selectedRiders = Object.values(picks);

    if (selectedRiders.some((rider) => rider === "")) {
      setMessage("Please select a rider for every position.");
      return;
    }

    if (new Set(selectedRiders).size !== selectedRiders.length) {
      setMessage("Each rider can only be selected once.");
      return;
    }

    setMessage(
      "Picks look good. Saving to user accounts and the database comes next."
    );
  }

  const pickFields: {
    key: PickKey;
    label: string;
    description: string;
  }[] = [
    {
      key: "first",
      label: "1st Place",
      description: "Choose the rider you think will win.",
    },
    {
      key: "second",
      label: "2nd Place",
      description: "Choose the rider you think will finish second.",
    },
    {
      key: "third",
      label: "3rd Place",
      description: "Choose the rider you think will finish third.",
    },
    {
      key: "wildcard",
      label: `Wildcard — ${nextRace.wildcardPosition}th Place`,
      description: `Choose the rider you think will finish ${nextRace.wildcardPosition}th.`,
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto max-w-4xl py-16">
          <Link
            href="/"
            className="text-sm font-bold text-zinc-400 transition hover:text-white"
          >
            ← Back to next race
          </Link>

          <p className="mt-10 text-sm font-black uppercase tracking-[0.4em] text-orange-500">
            Round {nextRace.round}
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
            Enter Your Picks
          </h1>

          <p className="mt-4 text-xl text-zinc-400">
            {nextRace.name} • {nextRace.location}
          </p>

          <div className="mt-10 space-y-5">
            {pickFields.map((field) => (
              <div
                key={field.key}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-center">
                  <div>
                    <h2 className="text-2xl font-black">{field.label}</h2>

                    <p className="mt-2 text-zinc-400">{field.description}</p>
                  </div>

                  <select
                    disabled={picksLocked}
                    value={picks[field.key]}
                    onChange={(event) =>
                      updatePick(field.key, event.target.value)
                    }
                    className="w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 text-lg font-bold text-white outline-none transition focus:border-orange-500"
                  >
                    <option value="">Select rider</option>

                    {availableRiders.map((rider) => (
                      <option key={rider.id} value={rider.full_name}>
                        #{rider.race_number} — {rider.full_name} — {rider.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {message && (
            <div className="mt-6 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-5 py-4 text-center font-bold text-orange-300">
              {message}
            </div>
          )}

          <button
            type="button"
disabled={picksLocked}
            onClick={submitPicks}
            className={`mt-8 w-full rounded-full px-10 py-5 text-xl font-black transition ${
  picksLocked
    ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
    : "bg-orange-500 text-black hover:scale-[1.01] hover:bg-orange-400"
}`}
          >
            {picksLocked ? "Picks Locked" : "Submit Picks"}
          </button>

          <p className="mt-5 text-center text-sm text-zinc-500">
            <p className="mt-5 text-center text-sm text-zinc-500">
  {picksLocked
    ? `Picks locked at ${new Date(nextRace.pickLock).toLocaleString()}.`
    : `Picks close ${new Date(nextRace.pickLock).toLocaleString()}.`}
</p>
          </p>
        </section>
      </div>
    </main>
  );
}