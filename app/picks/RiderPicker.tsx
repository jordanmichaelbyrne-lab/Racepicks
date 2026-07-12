"use client";

import { useMemo, useRef, useState } from "react";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
};

type RiderPickerProps = {
  riders: Rider[];
  selectedRiderId: string;
  unavailableRiderIds: string[];
  onSelect: (riderId: string) => void;
};

export default function RiderPicker({
  riders,
  selectedRiderId,
  unavailableRiderIds,
  onSelect,
}: RiderPickerProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedRider = riders.find(
    (rider) => rider.id === selectedRiderId
  );

  const filteredRiders = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return [...riders]
      .filter((rider) => {
        const searchableText = [
          rider.race_number,
          rider.full_name,
          rider.team_name,
          rider.manufacturer,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          searchValue.length === 0 ||
          searchableText.includes(searchValue)
        );
      })
      .sort((firstRider, secondRider) => {
        const firstNumber = firstRider.race_number ?? 9999;
        const secondNumber = secondRider.race_number ?? 9999;

        return firstNumber - secondNumber;
      });
  }, [riders, search]);

  function openPicker() {
    setIsOpen(true);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function selectRider(riderId: string) {
    onSelect(riderId);
    setSearch("");
    setIsOpen(false);
  }

  function clearSelection() {
    onSelect("");
    setSearch("");
    openPicker();
  }

  return (
    <div className="relative mt-5">
      {selectedRider && !isOpen ? (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full items-center gap-4 rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-left transition hover:border-orange-500"
        >
          <div className="flex h-12 min-w-14 items-center justify-center rounded-xl bg-orange-500 px-2 font-black text-black">
            #{selectedRider.race_number ?? "—"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-black text-white">
              {selectedRider.full_name}
            </p>

            <p className="truncate text-sm text-zinc-400">
              {selectedRider.manufacturer ?? "Unknown manufacturer"}
              {selectedRider.team_name
                ? ` • ${selectedRider.team_name}`
                : ""}
            </p>
          </div>

          <span className="text-sm font-bold text-zinc-500">
            Change
          </span>
        </button>
      ) : (
        <>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setSearch(event.target.value);
              setIsOpen(true);
            }}
            placeholder="Search rider, number, team or bike..."
            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
          />

          {isOpen && (
            <div className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
              {selectedRiderId && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="w-full border-b border-zinc-800 px-4 py-3 text-left text-sm font-bold text-red-400 transition hover:bg-zinc-900"
                >
                  Clear selection
                </button>
              )}

              {filteredRiders.length > 0 ? (
                filteredRiders.map((rider) => {
                  const isUnavailable =
                    unavailableRiderIds.includes(rider.id) &&
                    rider.id !== selectedRiderId;

                  return (
                    <button
                      key={rider.id}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => selectRider(rider.id)}
                      className="flex w-full items-center gap-4 border-b border-zinc-800 px-4 py-3 text-left transition last:border-b-0 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <div className="flex h-11 min-w-14 items-center justify-center rounded-xl bg-orange-500 px-2 font-black text-black">
                        #{rider.race_number ?? "—"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white">
                          {rider.full_name}
                        </p>

                        <p className="truncate text-sm text-zinc-400">
                          {rider.manufacturer ??
                            "Unknown manufacturer"}
                          {rider.team_name
                            ? ` • ${rider.team_name}`
                            : ""}
                        </p>
                      </div>

                      {isUnavailable && (
                        <span className="text-xs font-bold uppercase text-zinc-600">
                          Already picked
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-center text-zinc-500">
                  No matching riders found.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}