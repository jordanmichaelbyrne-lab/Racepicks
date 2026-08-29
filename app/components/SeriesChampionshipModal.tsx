"use client";

import { useEffect, useState } from "react";

type TopPlayer = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  series_points: number;
};

type SeriesChampionshipModalProps = {
  eventId: string;
  seriesName: string;
  season: number;
  topThree: TopPlayer[];
};

const PRIZES = [
  { place: "1st", label: "Champion", amount: "$150" },
  { place: "2nd", label: "Runner-Up", amount: "$100" },
  { place: "3rd", label: "Third Place", amount: "$50" },
];

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getMedalStyle(position: number) {
  if (position === 0) return "bg-orange-500 text-black";
  if (position === 1) return "bg-zinc-300 text-black";
  return "bg-amber-700 text-white";
}

export default function SeriesChampionshipModal({
  eventId,
  seriesName,
  season,
  topThree,
}: SeriesChampionshipModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Show once per browser, per series finale — a returning visitor who
  // already dismissed it for this event won't see it again.
  useEffect(() => {
    const storageKey = `racepicks_seen_championship_recap_${eventId}`;

    try {
      const alreadySeen = window.localStorage.getItem(storageKey);

      if (!alreadySeen) {
        setIsOpen(true);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — just show it.
      setIsOpen(true);
    }
  }, [eventId]);

  function handleClose() {
    setIsOpen(false);

    try {
      window.localStorage.setItem(
        `racepicks_seen_championship_recap_${eventId}`,
        "true"
      );
    } catch {
      // Ignore — non-critical.
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="championship-modal-title"
      onClick={handleClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-orange-500/40 bg-zinc-950 shadow-2xl"
      >
        <div className="relative border-b border-zinc-800 bg-gradient-to-br from-orange-500/15 via-transparent to-transparent p-7 sm:p-9">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-lg text-zinc-400 transition hover:border-zinc-500 hover:text-white"
          >
            ×
          </button>

          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            {season} Season
          </p>

          <h2
            id="championship-modal-title"
            className="mt-3 text-3xl font-black uppercase leading-tight sm:text-4xl"
          >
            {seriesName} Championship Complete! 🏁
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            That&apos;s the {seriesName} season wrapped. Here&apos;s who
            topped the standings — the overall Racepicks Championship
            keeps rolling until the final SMX round.
          </p>
        </div>

        <div className="p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
            {seriesName} Top 3
          </p>

          {topThree.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Standings will appear here shortly.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {topThree.map((player, index) => (
                <div
                  key={player.user_id}
                  className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-black/40 p-4"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${getMedalStyle(
                      index
                    )}`}
                  >
                    {index + 1}
                  </div>

                  {player.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={player.avatar_url}
                      alt={player.display_name}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10 text-xs font-black text-orange-400">
                      {getInitials(player.display_name) || "RP"}
                    </div>
                  )}

                  <p className="min-w-0 flex-1 truncate font-black">
                    {player.display_name}
                  </p>

                  <p className="shrink-0 text-lg font-black text-orange-500">
                    {player.series_points}
                    <span className="ml-1 text-[10px] font-bold uppercase text-zinc-600">
                      pts
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-7 rounded-2xl border border-zinc-800 bg-black/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                Championship Prizes
              </p>

              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                🔒 Launching 2027
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {PRIZES.map((prize) => (
                <div
                  key={prize.place}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    {prize.place}
                  </p>
                  <p className="mt-2 text-xl font-black text-zinc-300">
                    {prize.amount}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-600">
              Cash prizes aren&apos;t active this season — this is a
              preview of what&apos;s planned for the 2027 public launch.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="mt-7 w-full rounded-full bg-orange-500 px-7 py-4 font-black uppercase text-black transition hover:bg-orange-400"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}