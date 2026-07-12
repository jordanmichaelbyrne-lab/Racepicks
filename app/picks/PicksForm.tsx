"use client";

import { useEffect, useMemo, useState } from "react";
import { savePicks } from "./actions";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
};

type PickKey = "first" | "second" | "third" | "wildcard";

type Picks = Record<PickKey, string>;

type PicksFormProps = {
  eventId: string;
  riders: Rider[];
  wildcardPosition: number;
  picksCloseAt: string;
  initialPicks: Picks;
  hasSavedPicks: boolean;
};

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export default function PicksForm({
  eventId,
  riders,
  wildcardPosition,
  picksCloseAt,
  initialPicks,
  hasSavedPicks,
}: PicksFormProps) {
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [picksLocked, setPicksLocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPreviously, setSavedPreviously] = useState(hasSavedPicks);

  useEffect(() => {
    function updateCountdown() {
      const lockDate = new Date(picksCloseAt);
      const lockTime = lockDate.getTime();

      if (Number.isNaN(lockTime)) {
        setPicksLocked(true);
        setTimeRemaining("Lock time unavailable");
        return;
      }

      const difference = lockTime - Date.now();

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
  }, [picksCloseAt]);

  const formattedCloseTime = useMemo(() => {
    const closeDate = new Date(picksCloseAt);

    if (Number.isNaN(closeDate.getTime())) {
      return "Closing time unavailable";
    }

    return new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Brisbane",
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(closeDate);
  }, [picksCloseAt]);

  const pickFields: {
    key: PickKey;
    label: string;
    description: string;
  }[] = [
    {
      key: "first",
      label: "1st Place",
      description: "Who wins it?",
    },
    {
      key: "second",
      label: "2nd Place",
      description: "Who finishes runner-up?",
    },
    {
      key: "third",
      label: "3rd Place",
      description: "Who grabs the final podium spot?",
    },
    {
      key: "wildcard",
      label: `Wildcard — ${wildcardPosition}th`,
      description: `Who finishes in ${wildcardPosition}th place?`,
    },
  ];

  function updatePick(key: PickKey, riderId: string) {
    if (picksLocked || isSaving) {
      return;
    }

    setPicks((current) => ({
      ...current,
      [key]: riderId,
    }));

    setMessage(null);
  }

  async function handleSubmit() {
    if (picksLocked) {
      setMessage({
        type: "error",
        text: "Picks are locked for this round.",
      });
      return;
    }

    const selectedRiderIds = Object.values(picks);

    if (selectedRiderIds.some((riderId) => riderId === "")) {
      setMessage({
        type: "error",
        text: "Choose a rider for all four positions.",
      });
      return;
    }

    if (new Set(selectedRiderIds).size !== selectedRiderIds.length) {
      setMessage({
        type: "error",
        text: "Each rider can only be selected once.",
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const result = await savePicks({
        eventId,
        firstRiderId: picks.first,
        secondRiderId: picks.second,
        thirdRiderId: picks.third,
        wildcardRiderId: picks.wildcard,
      });

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message,
      });

      if (result.success) {
        setSavedPreviously(true);
      }
    } catch (error) {
      console.error("Pick submission error:", error);

      setMessage({
        type: "error",
        text: "Something went wrong while saving your picks.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="rounded-3xl border border-orange-500/30 bg-orange-500/10 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
          Picks Close
        </p>

        <h2 className="mt-3 text-4xl font-black">
          {timeRemaining || "Loading..."}
        </h2>

        <p className="mt-3 text-sm text-zinc-400">
          {formattedCloseTime}
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {pickFields.map((field) => (
          <div
            key={field.key}
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-center">
              <div>
                <h2 className="text-2xl font-black">{field.label}</h2>

                <p className="mt-2 text-zinc-400">
                  {field.description}
                </p>
              </div>

              <select
                value={picks[field.key]}
                disabled={picksLocked || isSaving}
                onChange={(event) =>
                  updatePick(field.key, event.target.value)
                }
                className="w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 text-lg font-bold text-white outline-none transition focus:border-orange-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-500"
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
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`mt-6 rounded-2xl border px-5 py-4 text-center font-bold ${
            message.type === "success"
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-orange-500/40 bg-orange-500/10 text-orange-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="button"
        disabled={picksLocked || isSaving}
        onClick={handleSubmit}
        className="mt-8 w-full rounded-full bg-orange-500 px-10 py-5 text-xl font-black text-black transition hover:scale-[1.01] hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:hover:scale-100"
      >
        {picksLocked
          ? "Picks Locked"
          : isSaving
            ? "Saving..."
            : savedPreviously
              ? "Update Picks"
              : "Lock In Picks"}
      </button>

      <p className="mt-5 text-center text-sm text-zinc-500">
        {picksLocked
          ? "Picks are locked for this round."
          : "You can update your picks until the closing time above."}
      </p>
    </section>
  );
}