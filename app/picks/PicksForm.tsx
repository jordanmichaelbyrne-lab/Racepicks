"use client";

import { FormEvent, useState } from "react";
import { savePicks } from "./actions";
import RiderPicker from "./RiderPicker";

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
  initialPicks: Picks;
  hasSavedPicks: boolean;
};

type PickKey = "first" | "second" | "third" | "wildcard";

type Picks = Record<PickKey, string>;



export default function PicksForm({
  eventId,
  riders,
  wildcardPosition,
  initialPicks,
  hasSavedPicks,
}: PicksFormProps) {
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  function updatePick(position: PickKey, riderId: string) {
    setMessage("");
    setIsSuccess(false);
    setIsReviewing(false);

    setPicks((currentPicks) => ({
      ...currentPicks,
      [position]: riderId,
    }));
  }

  function getUnavailableRiderIds(position: PickKey) {
    return Object.entries(picks)
      .filter(
        ([pickPosition, riderId]) =>
          pickPosition !== position && Boolean(riderId)
      )
      .map(([, riderId]) => riderId);
  }

  function getRider(riderId: string) {
    return riders.find((rider) => rider.id === riderId);
  }

  function validatePicks() {
    const selectedRiders = Object.values(picks);

    if (selectedRiders.some((riderId) => !riderId)) {
      setMessage("Please select all four riders.");
      setIsSuccess(false);
      return false;
    }

    if (new Set(selectedRiders).size !== selectedRiders.length) {
      setMessage("Each rider can only be selected once.");
      setIsSuccess(false);
      return false;
    }

    return true;
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSuccess(false);

    if (!validatePicks()) {
      return;
    }

    setIsReviewing(true);
  }

  async function handleConfirmPicks() {
    if (!validatePicks()) {
      setIsReviewing(false);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

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

    if (result.success) {
      setIsReviewing(false);
    }
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

  const reviewRows: Array<{
    key: PickKey;
    shortLabel: string;
    fullLabel: string;
  }> = [
    {
      key: "first",
      shortLabel: "1ST",
      fullLabel: "1st Place",
    },
    {
      key: "second",
      shortLabel: "2ND",
      fullLabel: "2nd Place",
    },
    {
      key: "third",
      shortLabel: "3RD",
      fullLabel: "3rd Place",
    },
    {
      key: "wildcard",
      shortLabel: "WC",
      fullLabel: `Wildcard — ${wildcardPosition}th`,
    },
  ];

  return (
    <>
      <form onSubmit={handleReview} className="mt-10 space-y-5">
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

            <RiderPicker
              riders={riders}
              selectedRiderId={picks[section.key]}
              unavailableRiderIds={getUnavailableRiderIds(
                section.key
              )}
              onSelect={(riderId) =>
                updatePick(section.key, riderId)
              }
            />
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
          className="w-full rounded-full bg-orange-500 px-8 py-4 text-lg font-black text-black transition hover:bg-orange-400"
        >
          {hasSavedPicks ? "Review Updated Picks" : "Review My Picks"}
        </button>
      </form>

      {isReviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
              Final Check
            </p>

            <h2 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Your Picks
            </h2>

            <p className="mt-3 text-zinc-400">
              Happy with your lineup? You can still update your picks
              while the event remains open.
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
              {reviewRows.map((row) => {
                const rider = getRider(picks[row.key]);

                return (
                  <div
                    key={row.key}
                    className={
                      row.key === "wildcard"
                        ? "flex items-center gap-4 border-t border-orange-500/40 bg-orange-500/10 p-5"
                        : "flex items-center gap-4 border-b border-zinc-800 bg-black p-5 last:border-b-0"
                    }
                  >
                    <div
                      className={
                        row.key === "wildcard"
                          ? "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 font-black text-black"
                          : "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 font-black text-white"
                      }
                    >
                      {row.shortLabel}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        {row.fullLabel}
                      </p>

                      <p className="mt-1 text-xl font-black text-white">
                        #{rider?.race_number ?? "—"}{" "}
                        {rider?.full_name ?? "No rider selected"}
                      </p>

                      <p className="mt-1 truncate text-sm text-zinc-400">
                        {rider?.manufacturer ??
                          "Unknown manufacturer"}
                        {rider?.team_name
                          ? ` • ${rider.team_name}`
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsReviewing(false)}
                className="rounded-full border border-zinc-700 px-7 py-4 font-black text-white transition hover:border-white disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPicks}
                className="rounded-full bg-orange-500 px-7 py-4 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
  ? "Saving Picks..."
  : hasSavedPicks
    ? "Update My Picks"
    : "I’m Locked In"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}