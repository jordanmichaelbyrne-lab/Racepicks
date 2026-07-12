"use client";

import { FormEvent, useMemo, useState } from "react";
import { savePicks } from "./actions";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
};

type PicksFormProps = {
  eventId: string;
  riders: Rider[];
  wildcardPosition: number;
};

type PickKey = "first" | "second" | "third" | "wildcard";

type Picks = Record<PickKey, string>;

const emptyPicks: Picks = {
  first: "",
  second: "",
  third: "",
  wildcard: "",
};

export default function PicksForm({
  eventId,
  riders,
  wildcardPosition,
}: PicksFormProps) {
  const [picks, setPicks] = useState<Picks>(emptyPicks);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedRiders = useMemo(
    () =>
      [...riders].sort((firstRider, secondRider) => {
        const firstNumber = firstRider.race_number ?? 9999;
        const secondNumber = secondRider.race_number ?? 9999;

        return firstNumber - secondNumber;
      }),
    [riders]
  );

  function updatePick(position: PickKey, riderId: string) {
    setMessage("");
    setIsSuccess(false);

    setPicks((currentPicks) => ({
      ...currentPicks,
      [position]: riderId,
    }));
  }

  function isRiderUsedElsewhere(
    position: PickKey,
    riderId: string
  ) {
    if (!riderId) {
      return false;
    }

    return Object.entries(picks).some(
      ([pickPosition, selectedRiderId]) =>
        pickPosition !== position && selectedRiderId === riderId
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSuccess(false);

    const selectedRiders = Object.values(picks);

    if (selectedRiders.some((riderId) => !riderId)) {
      setMessage("Please select all four riders.");
      return;
    }

    if (new Set(selectedRiders).size !== selectedRiders.length) {
      setMessage("Each rider can only be selected once.");
      return;
    }

    setIsSubmitting(true);

    const result = await savePicks({
      eventId,
      firstRiderId: picks.first,
      secondRiderId: picks.second,
      thirdRiderId: picks.third,
      wildcardRiderId: picks.wildcard,
    });

    setMessage(result.message);
    setIsSuccess(result.success);
    setIsSubmitting(false);
  }

  const pickSections: Array<{
    key: PickKey;
    label: string;
    points: number;
    accent?: boolean;
  }> = [
    {
      key: "first",
      label: "1st Place",
      points: 25,
    },
    {
      key: "second",
      label: "2nd Place",
      points: 22,
    },
    {
      key: "third",
      label: "3rd Place",
      points: 20,
    },
    {
      key: "wildcard",
      label: `Wildcard — ${wildcardPosition}th Place`,
      points: 25,
      accent: true,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-5">
      {pickSections.map((section) => (
        <div
          key={section.key}
          className={
            section.accent
              ? "rounded-3xl border border-orange-500/50 bg-orange-500/10 p-6"
              : "rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
          }
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className={
                  section.accent
                    ? "text-sm font-black uppercase tracking-[0.25em] text-orange-400"
                    : "text-sm font-black uppercase tracking-[0.25em] text-zinc-400"
                }
              >
                {section.label}
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Worth {section.points} points
              </p>
            </div>

            <span className="rounded-full bg-black px-4 py-2 text-sm font-black">
              {section.points} pts
            </span>
          </div>

          <select
            required
            value={picks[section.key]}
            onChange={(event) =>
              updatePick(section.key, event.target.value)
            }
            className="mt-5 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-4 text-white outline-none transition focus:border-orange-500"
          >
            <option value="">Select a rider</option>

            {sortedRiders.map((rider) => (
              <option
                key={rider.id}
                value={rider.id}
                disabled={isRiderUsedElsewhere(
                  section.key,
                  rider.id
                )}
              >
                #{rider.race_number ?? "—"} — {rider.full_name}
                {rider.manufacturer
                  ? ` — ${rider.manufacturer}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      ))}

      {message && (
        <div
          className={
            isSuccess
              ? "rounded-2xl border border-green-500/40 bg-green-500/10 px-5 py-4 text-sm font-bold text-green-300"
              : "rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300"
          }
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-orange-500 px-8 py-4 text-lg font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Saving Picks..." : "Submit Picks"}
      </button>
    </form>
  );
}