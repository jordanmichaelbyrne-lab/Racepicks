"use client";

import Link from "next/link";
import { ReactNode, useState, useTransition } from "react";
import {
  getCompetitionStandingsAction,
  type CompetitionStandingsResult,
} from "@/app/lib/get-competition-standings-action";

type Competition = {
  slug: string;
  label: string;
};

type LeaderboardTabsProps = {
  competitions: Competition[];
  currentUserId: string;
  overallContent: ReactNode;
  hasHistory: boolean;
};

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getMedalStyle(position: number) {
  if (position === 1) return "bg-orange-500 text-black";
  if (position === 2) return "bg-neutral-300 text-black";
  if (position === 3) return "bg-amber-700 text-white";
  return "bg-neutral-800 text-neutral-400";
}

function formatSeriesLabel(series: string) {
  if (series === "Motocross") return "Pro Motocross";
  if (series === "Supercross") return "Supercross";
  if (series === "SMX") return "SMX Championship";
  return series;
}

export default function LeaderboardTabs({
  competitions,
  currentUserId,
  overallContent,
  hasHistory,
}: LeaderboardTabsProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [cache, setCache] = useState<
    Record<string, CompetitionStandingsResult>
  >({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTabClick(slug: string | null) {
    if (slug === null) {
      setActiveSlug(null);
      return;
    }

    if (cache[slug]) {
      setActiveSlug(slug);
      return;
    }

    setLoadingSlug(slug);

    startTransition(async () => {
      const result = await getCompetitionStandingsAction(slug);

      if (result) {
        setCache((current) => ({ ...current, [slug]: result }));
      }

      setActiveSlug(slug);
      setLoadingSlug(null);
    });
  }

  const activeCompetition = activeSlug
    ? competitions.find((competition) => competition.slug === activeSlug)
    : null;

  const activeData = activeSlug ? cache[activeSlug] : null;

  return (
    <div>
      <div
        className="mt-8 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() => handleTabClick(null)}
          className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-black uppercase tracking-wide transition ${
            activeSlug === null
              ? "border-orange-500 bg-orange-500 text-black"
              : "border-neutral-700 text-neutral-300 hover:border-orange-500 hover:text-orange-400"
          }`}
        >
          Overall Championship
        </button>

        {competitions.map((competition) => {
          const isActive = activeSlug === competition.slug;
          const isLoadingThis = loadingSlug === competition.slug;

          return (
            <button
              key={competition.slug}
              type="button"
              onClick={() => handleTabClick(competition.slug)}
              disabled={isLoadingThis}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-black uppercase tracking-wide transition ${
                isActive
                  ? "border-orange-500 bg-orange-500 text-black"
                  : "border-neutral-700 text-neutral-300 hover:border-orange-500 hover:text-orange-400"
              } ${isLoadingThis ? "opacity-60" : ""}`}
            >
              {isLoadingThis ? "Loading…" : competition.label}
            </button>
          );
        })}

        {hasHistory && (
          <Link
            href="/leaderboard/history"
            className="shrink-0 rounded-full border border-dashed border-neutral-700 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-neutral-400 transition hover:border-orange-500 hover:text-orange-400"
          >
            History →
          </Link>
        )}
      </div>

      {activeSlug === null ? (
        overallContent
      ) : isPending && !activeData ? (
        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-10 text-center text-neutral-500">
          Loading standings…
        </div>
      ) : !activeData || activeData.standings.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-10 text-center">
          <h2 className="text-xl font-bold">No standings yet</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Standings for {activeCompetition?.label} will appear here once
            a round has been scored.
          </p>
        </div>
      ) : (
        <section className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Racepicks Standings
          </p>

          <h2 className="mt-3 text-3xl font-black">
            {activeData.season} {formatSeriesLabel(activeData.series)}{" "}
            Leaderboard
          </h2>

          <div className="mt-6 rounded-3xl border border-orange-500/30 bg-orange-500/10 p-6 sm:p-8">
            {(() => {
              const leader = activeData.standings[0];
              const isYou = leader.user_id === currentUserId;
              const displayName = leader.display_name?.trim() || "Racepicks Player";

              return (
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-black">
                      1
                    </span>

                    {leader.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={leader.avatar_url}
                        alt={displayName}
                        className="h-12 w-12 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/40 bg-black text-sm font-black text-orange-400">
                        {getInitials(displayName) || "RP"}
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-orange-400">
                        Leading This Series
                      </p>

                      <h3 className="mt-1 text-xl font-black sm:text-2xl">
                        {displayName}
                        {isYou && (
                          <span className="ml-3 rounded-full bg-orange-500 px-3 py-1 align-middle text-xs font-black uppercase text-black">
                            You
                          </span>
                        )}
                      </h3>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-3xl font-black">
                      {leader.series_points}
                    </p>
                    <p className="text-xs font-black uppercase tracking-widest text-orange-400">
                      Points
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
            <div className="hidden grid-cols-[80px_1fr_130px_110px] border-b border-neutral-800 bg-black/40 px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-500 md:grid">
              <div>Pos</div>
              <div>Player</div>
              <div className="text-right">Rounds</div>
              <div className="text-right">Points</div>
            </div>

            <div className="divide-y divide-neutral-800">
              {activeData.standings.map((player, index) => {
                const position = index + 1;
                const isYou = player.user_id === currentUserId;
                const displayName =
                  player.display_name?.trim() || "Racepicks Player";

                return (
                  <Link
                    key={player.user_id}
                    href={`/leaderboard/${player.user_id}`}
                    className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-neutral-800/40 sm:px-6 md:grid-cols-[80px_1fr_130px_110px] ${
                      isYou ? "bg-orange-500/10" : ""
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${getMedalStyle(
                        position
                      )}`}
                    >
                      {position}
                    </span>

                    <div className="flex min-w-0 items-center gap-3">
                      {player.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.avatar_url}
                          alt={displayName}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-black text-[10px] font-black text-neutral-400">
                          {getInitials(displayName) || "RP"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-black sm:text-base">
                            {displayName}
                          </p>

                          {isYou && (
                            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                              You
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-neutral-500 md:hidden">
                          {player.rounds_scored} round
                          {player.rounds_scored === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div className="hidden text-right text-sm text-neutral-400 md:block">
                      {player.rounds_scored}
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-orange-500">
                        {player.series_points}
                      </span>
                      <span className="ml-1 text-[10px] font-bold uppercase text-neutral-600">
                        pts
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}