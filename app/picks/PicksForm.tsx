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

type PickField = {
  key: PickKey;
  label: string;
  description: string;
};

function normaliseSearch(value: string) {
  return value.toLowerCase().trim();
}

function riderLabel(rider: Rider) {
  const number =
    typeof rider.race_number === "number"
      ? `#${rider.race_number}`
      : "#—";

  const details = [
    rider.manufacturer,
    rider.team_name,
  ].filter(Boolean);

  return `${number} — ${rider.full_name}${
    details.length > 0 ? ` — ${details.join(" — ")}` : ""
  }`;
}

export default function PicksForm({
  eventId,
  riders,
  wildcardPosition,
  picksCloseAt,
  initialPicks,
  hasSavedPicks,
}: PicksFormProps) {
  const [picks, setPicks] = useState<Picks>(initialPicks);

  const [searches, setSearches] = useState<
    Record<PickKey, string>
  >({
    first: "",
    second: "",
    third: "",
    wildcard: "",
  });

  const [openPicker, setOpenPicker] =
    useState<PickKey | null>(null);

  const [picksLocked, setPicksLocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPreviously, setSavedPreviously] =
    useState(hasSavedPicks);

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

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }

    updateCountdown();

    const interval = window.setInterval(
      updateCountdown,
      60000
    );

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

  const pickFields: PickField[] = [
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

  const selectedRiderIds = useMemo(
    () =>
      new Set(
        Object.values(picks).filter(
          (riderId) => riderId !== ""
        )
      ),
    [picks]
  );

  function findRider(riderId: string) {
    return riders.find((rider) => rider.id === riderId) ?? null;
  }

  function filteredRidersForField(fieldKey: PickKey) {
    const query = normaliseSearch(searches[fieldKey]);

    return riders.filter((rider) => {
      const selectedElsewhere =
        selectedRiderIds.has(rider.id) &&
        picks[fieldKey] !== rider.id;

      if (selectedElsewhere) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        rider.full_name,
        String(rider.race_number ?? ""),
        rider.manufacturer ?? "",
        rider.team_name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }

  function chooseRider(
    fieldKey: PickKey,
    riderId: string
  ) {
    if (picksLocked || isSaving) {
      return;
    }

    setPicks((current) => ({
      ...current,
      [fieldKey]: riderId,
    }));

    setSearches((current) => ({
      ...current,
      [fieldKey]: "",
    }));

    setOpenPicker(null);
    setMessage(null);
  }

  function clearPick(fieldKey: PickKey) {
    if (picksLocked || isSaving) {
      return;
    }

    setPicks((current) => ({
      ...current,
      [fieldKey]: "",
    }));

    setSearches((current) => ({
      ...current,
      [fieldKey]: "",
    }));

    setOpenPicker(fieldKey);
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

    const chosenRiderIds = Object.values(picks);

    if (
      chosenRiderIds.some((riderId) => riderId === "")
    ) {
      setMessage({
        type: "error",
        text: "Choose a rider for all four positions.",
      });
      return;
    }

    if (
      new Set(chosenRiderIds).size !==
      chosenRiderIds.length
    ) {
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
        {pickFields.map((field) => {
          const selectedRider = findRider(picks[field.key]);
          const matchingRiders =
            filteredRidersForField(field.key);
          const isOpen = openPicker === field.key;

          return (
            <div
              key={field.key}
              className={`rounded-3xl border p-6 ${
                field.key === "wildcard"
                  ? "border-orange-500/30 bg-orange-500/5"
                  : "border-zinc-800 bg-zinc-950"
              }`}
            >
              <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-start">
                <div>
                  <h2 className="text-2xl font-black">
                    {field.label}
                  </h2>

                  <p className="mt-2 text-zinc-400">
                    {field.description}
                  </p>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    disabled={picksLocked || isSaving}
                    onClick={() =>
                      setOpenPicker(
                        isOpen ? null : field.key
                      )
                    }
                    className={`flex w-full items-center justify-between gap-4 rounded-2xl border bg-black px-5 py-4 text-left transition ${
                      isOpen
                        ? "border-orange-500"
                        : "border-zinc-700"
                    } disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900`}
                  >
                    <span
                      className={
                        selectedRider
                          ? "font-black text-white"
                          : "font-bold text-zinc-500"
                      }
                    >
                      {selectedRider
                        ? riderLabel(selectedRider)
                        : "Select rider"}
                    </span>

                    <span className="text-zinc-500">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {isOpen && !picksLocked && !isSaving && (
                    <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
                      <div className="border-b border-zinc-800 p-3">
                        <input
                          type="search"
                          autoFocus
                          value={searches[field.key]}
                          onChange={(event) =>
                            setSearches((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder="Search name or race number"
                          className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 font-bold text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
                        />
                      </div>

                      <div className="max-h-72 overflow-y-auto p-2">
                        {selectedRider && (
                          <button
                            type="button"
                            onClick={() =>
                              clearPick(field.key)
                            }
                            className="mb-2 w-full rounded-xl border border-zinc-800 px-4 py-3 text-left text-sm font-bold text-zinc-400 transition hover:border-orange-500 hover:text-orange-400"
                          >
                            Clear selection
                          </button>
                        )}

                        {matchingRiders.length > 0 ? (
                          matchingRiders.map((rider) => (
                            <button
                              key={rider.id}
                              type="button"
                              onClick={() =>
                                chooseRider(
                                  field.key,
                                  rider.id
                                )
                              }
                              className={`w-full rounded-xl px-4 py-3 text-left transition hover:bg-zinc-900 ${
                                picks[field.key] === rider.id
                                  ? "bg-orange-500/10 text-orange-400"
                                  : "text-white"
                              }`}
                            >
                              <p className="font-black">
                                #{rider.race_number ?? "—"}{" "}
                                {rider.full_name}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {[
                                  rider.manufacturer,
                                  rider.team_name,
                                ]
                                  .filter(Boolean)
                                  .join(" • ") ||
                                  "Team information unavailable"}
                              </p>
                            </button>
                          ))
                        ) : (
                          <div className="p-5 text-center">
                            <p className="font-bold text-yellow-400">
                              No riders found
                            </p>

                            <p className="mt-2 text-sm text-zinc-500">
                              Try a different name or race number.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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