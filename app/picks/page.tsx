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

type EventEntryRow = {
  rider: Rider | Rider[] | null;
};

type PickKey = "first" | "second" | "third" | "wildcard";

type Picks = Record<PickKey, string>;

export default function PicksPage() {
  const nextRace = races[0];

  const [availableRiders, setAvailableRiders] = useState<Rider[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(true);

  const [timeRemaining, setTimeRemaining] = useState("");
  const [picksLocked, setPicksLocked] = useState(false);

  const [picks, setPicks] = useState<Picks>({
    first: "",
    second: "",
    third: "",
    wildcard: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRiders() {
      const supabase = createClient();

      const { data, error } = await supabase
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

      if (error) {
        console.error("Could not load entry-list riders:", error);
        setMessage("Could not load the rider list. Please refresh the page.");
        setLoadingRiders(false);
        return;
      }

      const rows = (data ?? []) as EventEntryRow[];

      const riders = rows
        .flatMap((entry) => {
          if (Array.isArray(entry.rider)) {
            return entry.rider;
          }

          return entry.rider ? [entry.rider] : [];
        })
        .filter(
          (rider, index, allRiders) =>
            allRiders.findIndex((item) => item.id === rider.id) === index
        )
        .sort((a, b) => {
          const numberA = a.race_number ?? Number.MAX_SAFE_INTEGER;
          const numberB = b.race_number ?? Number.MAX_SAFE_INTEGER;

          if (numberA !== numberB) {
            return numberA - numberB;
          }

          return a.full_name.localeCompare(b.full_name);
        });

      setAvailableRiders(riders);
      setLoadingRiders(false);
    }

    loadRiders();
  }, []);

  useEffect(() => {
    function updateCountdown() {
      const lockDate = new Date(nextRace.pickLock);
      const difference = lockDate.getTime() - Date.now();

      if (difference <= 0) {
        setPicksLocked(true);
        setTimeRemaining("Locked");
        return;
      }

      setPicksLocked(false);

      const days = Math.floor(
        difference / (1000 * 60 * 60 * 24)
      );

      const hours = Math.floor(
        (difference / (1000 * 60 * 60)) % 24
      );

      const minutes = Math.floor(
        (difference / (1000 * 60)) % 60
      );

      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    }

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [nextRace.pickLock]);

  function updatePick(key: PickKey, riderId: string) {
    if (picksLocked) {
      return;
    }

    setPicks((current) => ({
      ...current,
      [key]: riderId,
    }));

    setMessage("");
  }

  function submitPicks() {
    if (picksLocked) {
      setMessage("Picks are locked for this round.");
      return;
    }

    const selectedRiders = Object.values(picks);

    if (selectedRiders.some((riderId) => riderId === "")) {
      setMessage("Please select a rider for every position.");
      return;
    }

    if (new Set(selectedRiders).size !== selectedRiders.length) {
      setMessage("Each rider can only be selected once.");
      return;
    }

    setMessage(
      "Picks look good. Saving them to your account comes next."
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

          <div className="mt-8 rounded-3xl border border-orange-500/30 bg-orange-500/10 p-6 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
              Picks Close
            </p>

            <h2 className="mt-2 text-4xl font-black">
              {timeRemaining || "Loading..."}
            </h2>

            <p className="mt-3 text-zinc-400">
              {nextRace.pickLockDisplay}
            </p>
          </div>

          {loadingRiders ? (
            <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
              <p className="font-bold text-zinc-300">
                Loading the rider list...
              </p>
            </div>
          ) : availableRiders.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
              <h2 className="text-2xl font-black">
                Rider list coming soon
              </h2>

              <p className="mt-3 text-zinc-400">
                The confirmed gate has not been published yet.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-10 space-y-5">
                {pickFields.map((field) => (
                  <div
                    key={field.key}
                    className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
                  >
                    <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-center">
                      <div>
                        <h2 className="text-2xl font-black">
                          {field.label}
                        </h2>

                        <p className="mt-2 text-zinc-400">
                          {field.description}
                        </p>
                      </div>

                      <select
                        disabled={picksLocked}
                        value={picks[field.key]}
                        onChange={(event) =>
                          updatePick(field.key, event.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 text-lg font-bold text-white outline-none transition focus:border-orange-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-500"
                      >
                        <option value="">Select rider</option>

                        {availableRiders.map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            #{rider.race_number ?? "—"} —{" "}
                            {rider.full_name}
                            {rider.team_name
                              ? ` — ${rider.team_name}`
                              : ""}
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
                className="mt-8 w-full rounded-full bg-orange-500 px-10 py-5 text-xl font-black text-black transition hover:scale-[1.01] hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:hover:scale-100"
              >
                {picksLocked ? "Picks Locked" : "Submit Picks"}
              </button>

              <p className="mt-5 text-center text-sm text-zinc-500">
                {picksLocked
                  ? "Picks are locked for this round."
                  : "Picks can be changed until the lock time shown above."}
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}