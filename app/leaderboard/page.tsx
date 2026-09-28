import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import LeaderboardTabs from "./LeaderboardTabs";
import { pickFocusSeason } from "@/app/lib/current-season";
import { getSeasonStandings } from "@/app/lib/season-standings";

type LeaderboardPlayer = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rounds_scored: number;
  total_points: number;
  best_round: number;
};

type LatestEvent = {
  id: string;
  venue: string;
  series: string;
  season: number;
  round_number: number;
};

type CurrentEvent = {
  id: string;
  venue: string;
  series: string;
  season: number;
  round_number: number;
  status: string;
};

type SubmittedPick = {
  user_id: string;
};

type PreviousRoundScore = {
  user_id: string;
  round_points: number;
};

type EventRow = {
  id: string;
  venue: string;
  series: string;
  season: number;
  round_number: number;
  race_date: string;
  status: string;
  competition_slug: string;
};

type SeasonTile = {
  season: number;
  href: string;
  isViewed: boolean;
  statusLabel: string;
  statusClass: string;
  detailLabel: string;
  detailValue: string;
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    season?: string;
  }>;
};

const PLAYERS_PER_PAGE = 25;

function getPositionStyle(position: number) {
  if (position === 1) {
    return "bg-orange-500 text-black";
  }

  if (position === 2) {
    return "bg-neutral-300 text-black";
  }

  if (position === 3) {
    return "bg-amber-700 text-white";
  }

  return "bg-neutral-800 text-neutral-300";
}

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getPointsBehindLeader(
  player: LeaderboardPlayer,
  leader: LeaderboardPlayer | undefined
) {
  if (!leader || player.user_id === leader.user_id) {
    return "Leader";
  }

  return `-${leader.total_points - player.total_points} pts`;
}

function PlayerAvatar({
  player,
  compact = false,
}: {
  player: LeaderboardPlayer;
  compact?: boolean;
}) {
  const sizeClass = compact ? "h-10 w-10 text-sm" : "h-14 w-14 text-lg";

  if (player.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.avatar_url}
        alt={player.display_name}
        className={`${sizeClass} rounded-xl object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-xl bg-orange-500 font-black text-black`}
    >
      {getInitials(player.display_name) || "RP"}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M2.5 12C4.8 7.7 8.1 5.5 12 5.5S19.2 7.7 21.5 12C19.2 16.3 15.9 18.5 12 18.5S4.8 16.3 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Same pattern as Banter and every other player-facing page — the
  // leaderboard shows real player names/points, so it's for logged-in
  // players only, not public/anonymous visitors.
  if (!user) {
    redirect("/login");
  }

  // Captured as a plain string right after the check above — TypeScript
  // can't carry the "user is non-null" narrowing into the CompactPlayerRow
  // closure below, since it's a separate nested function, but a primitive
  // value captured here is safe.
  const currentUserId = user.id;

  const { data, error } = await supabase
    .from("events")
    .select(
      `
        id,
        venue,
        series,
        season,
        round_number,
        race_date,
        status,
        competition_slug
      `
    )
    .order("race_date", { ascending: true });

  if (error) {
    console.error("Championship loading error:", error);

    return (
      <main className="min-h-screen bg-neutral-950 px-4 py-12 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-block text-sm font-bold text-neutral-400 transition hover:text-orange-500"
          >
            ← Back to Race Centre
          </Link>

          <h1 className="mt-8 text-4xl font-black uppercase">
            Championship
          </h1>

          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/40 p-6">
            <p className="font-semibold text-red-300">
              The championship could not be loaded.
            </p>

            <p className="mt-2 text-sm text-red-400">
              Check the server terminal for the Supabase error.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const eventRows = (data ?? []) as EventRow[];

  // Which season to show. By default it's the season the site is
  // focused on (same choice as the homepage), so once a new season is
  // next up the board rolls over to a fresh one. ?season=YYYY reaches
  // any earlier season's final board.
  const focusSeason = pickFocusSeason(eventRows) ?? new Date().getFullYear();

  const allSeasons = Array.from(
    new Set(eventRows.map((event) => event.season))
  ).sort((first, second) => second - first);

  const requestedSeason = Number.parseInt(params.season ?? "", 10);

  const viewSeason = allSeasons.includes(requestedSeason)
    ? requestedSeason
    : focusSeason;

  const isFocusSeason = viewSeason === focusSeason;

  const viewSeasonEvents = eventRows.filter(
    (event) => event.season === viewSeason
  );

  const seasonBaseHref = isFocusSeason
    ? "/leaderboard"
    : `/leaderboard?season=${viewSeason}`;

  // Full, unfiltered, unpaginated standings for the viewed season —
  // always needed for accurate position numbers, "leader", and "points
  // behind" math, regardless of what's currently being searched or
  // which page is being viewed. Season-scoped, so it starts at zero
  // when a new season begins.
  const fullStandings: LeaderboardPlayer[] = await getSeasonStandings(
    supabase,
    viewSeason
  );
  const leader = fullStandings[0];

  const positionByUserId = new Map(
    fullStandings.map((player, index) => [player.user_id, index + 1])
  );

  const currentUserEntry = fullStandings.find(
    (player) => player.user_id === currentUserId
  );

  const currentUserPosition = positionByUserId.get(currentUserId);

  const completedSeasonEvents = viewSeasonEvents.filter(
    (event) => event.status === "completed"
  );

  const completedRounds = completedSeasonEvents.length;

  // Events are ordered by race date, so the last completed one is the
  // most recent round of THIS season.
  const latestEvent: LatestEvent | null =
    completedSeasonEvents[completedSeasonEvents.length - 1] ?? null;

  const championshipSeason = viewSeason;

  let previousRoundScoresByUser = new Map<string, number>();

  if (latestEvent) {
    const {
      data: previousRoundScoreData,
      error: previousRoundScoreError,
    } = await supabase
      .from("scores")
      .select("user_id, round_points")
      .eq("event_id", latestEvent.id)
      .order("round_points", { ascending: false });

    if (previousRoundScoreError) {
      console.error(
        "Previous round score loading error:",
        previousRoundScoreError
      );
    }

    const previousRoundScores =
      (previousRoundScoreData ?? []) as PreviousRoundScore[];

    previousRoundScoresByUser = new Map(
      previousRoundScores.map((score) => [
        score.user_id,
        score.round_points,
      ])
    );
  }

  // The NEXT RD column only makes sense for the season currently in
  // play — a finished past season has no "next round".
  const currentEvent: CurrentEvent | null = isFocusSeason
    ? (viewSeasonEvents.find((event) => event.status === "open") ??
      viewSeasonEvents.find((event) => event.status === "upcoming") ??
      null)
    : null;

  let submittedPickUserIds = new Set<string>();

  if (currentEvent) {
    const { data: submittedPickData, error: submittedPicksError } =
      await supabase
        .from("picks")
        .select("user_id")
        .eq("event_id", currentEvent.id);

    if (submittedPicksError) {
      console.error(
        "Submitted player picks loading error:",
        submittedPicksError
      );
    }

    submittedPickUserIds = new Set(
      ((submittedPickData ?? []) as SubmittedPick[]).map(
        (pick) => pick.user_id
      )
    );
  }

  // Search — simple case-insensitive substring match against display name.
  const searchQuery = (params.q ?? "").trim().toLowerCase();

  const searchedStandings = searchQuery
    ? fullStandings.filter((player) =>
        player.display_name.toLowerCase().includes(searchQuery)
      )
    : fullStandings;

  // Pagination
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const totalPages = Math.max(
    1,
    Math.ceil(searchedStandings.length / PLAYERS_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);

  const pageStart = (safePage - 1) * PLAYERS_PER_PAGE;
  const pageStandings = searchedStandings.slice(
    pageStart,
    pageStart + PLAYERS_PER_PAGE
  );

  // Podium only makes sense on an unsearched, first-page view — otherwise
  // it's confusing to show the literal top 3 while looking at a filtered
  // or later-page list.
  const showPodium = !searchQuery && safePage === 1;
  const podiumPlayers = showPodium ? fullStandings.slice(0, 3) : [];

  function buildPageHref(page: number) {
    const queryParams = new URLSearchParams();

    if (!isFocusSeason) {
      queryParams.set("season", String(viewSeason));
    }

    if (searchQuery) {
      queryParams.set("q", params.q ?? "");
    }

    if (page > 1) {
      queryParams.set("page", String(page));
    }

    const queryString = queryParams.toString();

    return queryString ? `/leaderboard?${queryString}` : "/leaderboard";
  }

  function CompactPlayerRow({ player }: { player: LeaderboardPlayer }) {
    const position = positionByUserId.get(player.user_id) ?? 0;
    const isCurrentUser = currentUserId === player.user_id;

    const hasCurrentPicks =
      currentEvent && submittedPickUserIds.has(player.user_id);

    const previousRoundPoints = previousRoundScoresByUser.get(
      player.user_id
    );

    const hasPreviousRoundScore = typeof previousRoundPoints === "number";

    return (
      <div
        className={`grid grid-cols-[40px_minmax(0,1fr)_70px] items-center gap-3 px-4 py-3 sm:grid-cols-[40px_minmax(0,1fr)_80px_90px_80px] sm:gap-4 sm:px-6 ${
          isCurrentUser
            ? "border-l-4 border-orange-500 bg-orange-500/10"
            : ""
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${getPositionStyle(
            position
          )}`}
        >
          {position}
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar player={player} compact />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/leaderboard/${player.user_id}?season=${viewSeason}`}
                className="truncate text-sm font-black transition hover:text-orange-400 sm:text-base"
              >
                {player.display_name}
              </Link>

              {isCurrentUser && (
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                  You
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-500 sm:hidden">
              {player.total_points} pts ·{" "}
              {getPointsBehindLeader(player, leader)}
            </p>
          </div>
        </div>

        <div className="hidden text-right sm:block">
          <span className="text-lg font-black text-orange-500">
            {player.total_points}
          </span>
          <span className="ml-1 text-[10px] font-bold uppercase text-neutral-500">
            pts
          </span>
        </div>

        <div className="hidden justify-self-end sm:block">
          {hasPreviousRoundScore ? (
            <Link
              href={`/leaderboard/${player.user_id}?season=${viewSeason}#round-history`}
              aria-label={`View ${player.display_name}'s previous round score`}
              title={`View ${player.display_name}'s previous round score`}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-black/20 px-3 text-xs font-black text-neutral-200 transition hover:border-orange-500 hover:text-orange-400"
            >
              <EyeIcon />
              <span>{previousRoundPoints}</span>
            </Link>
          ) : (
            <span className="flex h-9 items-center justify-center rounded-lg border border-neutral-800 bg-black/20 px-3 text-[10px] font-bold uppercase text-neutral-600">
              —
            </span>
          )}
        </div>

        <div className="justify-self-end">
          {hasCurrentPicks ? (
            <Link
              href={`/leaderboard/${player.user_id}?season=${viewSeason}#next-round-picks`}
              aria-label={`View ${player.display_name}'s next round picks`}
              title={`View ${player.display_name}'s next round picks`}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 text-xs font-black text-orange-400 transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
            >
              <EyeIcon />
              <span className="hidden lg:inline">Picks</span>
            </Link>
          ) : (
            <span className="flex h-9 items-center justify-center rounded-lg border border-neutral-800 bg-black/20 px-3 text-[10px] font-bold uppercase text-neutral-600">
              —
            </span>
          )}
        </div>
      </div>
    );
  }

  function formatCompetitionLabel(season: number, series: string) {
    if (series === "Motocross") return `${season} Pro Motocross`;
    if (series === "Supercross") return `${season} Supercross`;
    if (series === "SMX") return `${season} SMX Championship`;
    return `${season} ${series}`;
  }

  // Tabs for the VIEWED season's competitions, and only ones that have
  // actually started — a series whose rounds are all still "upcoming"
  // stays hidden rather than showing an empty tab.
  const competitionsForTabs: { slug: string; label: string }[] = [];
  const seenCompetitionSlugs = new Set<string>();

  for (const event of viewSeasonEvents) {
    if (seenCompetitionSlugs.has(event.competition_slug)) {
      continue;
    }

    seenCompetitionSlugs.add(event.competition_slug);

    const hasStarted = viewSeasonEvents.some(
      (other) =>
        other.competition_slug === event.competition_slug &&
        other.status !== "upcoming"
    );

    if (hasStarted) {
      competitionsForTabs.push({
        slug: event.competition_slug,
        label: formatCompetitionLabel(event.season, event.series),
      });
    }
  }

  function formatSeasonDate(date: string) {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Australia/Brisbane",
    }).format(new Date(date));
  }

  // Season tiles — the current season plus every earlier season that
  // has results, each linking to that season's own board. Only shown
  // once there is more than one to choose between.
  const seasonsWithActivity = allSeasons.filter(
    (season) =>
      season === focusSeason ||
      eventRows.some(
        (event) => event.season === season && event.status !== "upcoming"
      )
  );

  const seasonTiles: SeasonTile[] =
    seasonsWithActivity.length > 1
      ? await Promise.all(
          seasonsWithActivity.map(async (season) => {
            const seasonEvents = eventRows.filter(
              (event) => event.season === season
            );

            const started = seasonEvents.some(
              (event) => event.status !== "upcoming"
            );

            const complete =
              seasonEvents.length > 0 &&
              seasonEvents.every((event) => event.status === "completed");

            let topPlayer: LeaderboardPlayer | null = null;

            if (started) {
              const standings =
                season === viewSeason
                  ? fullStandings
                  : await getSeasonStandings(supabase, season);

              topPlayer = standings[0] ?? null;
            }

            let detailLabel = "Standings";
            let detailValue = "Awaiting first scores";

            if (topPlayer) {
              detailLabel = complete ? "Champion" : "Leading";
              detailValue = `${topPlayer.display_name} · ${topPlayer.total_points} pts`;
            } else if (!started && seasonEvents[0]) {
              detailLabel = "Season opens";
              detailValue = formatSeasonDate(seasonEvents[0].race_date);
            }

            return {
              season,
              href:
                season === focusSeason
                  ? "/leaderboard"
                  : `/leaderboard?season=${season}`,
              isViewed: season === viewSeason,
              statusLabel: complete
                ? "Final"
                : started
                  ? "In Progress"
                  : "Upcoming",
              statusClass: complete
                ? "bg-blue-500/10 text-blue-400"
                : started
                  ? "bg-green-500/10 text-green-400"
                  : "bg-neutral-800 text-neutral-400",
              detailLabel,
              detailValue,
            };
          })
        )
      : [];

  const standingsContent = (
    <>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Championship Leader
              </p>

              <p className="mt-2 text-xl font-black">
                {leader?.display_name ?? "No leader yet"}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Leading Score
              </p>

              <p className="mt-2 text-xl font-black text-orange-500">
                {leader ? `${leader.total_points} pts` : "0 pts"}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Rounds Completed
              </p>

              <p className="mt-2 text-xl font-black">
                {completedRounds ?? 0}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                {latestEvent
                  ? `Latest: ${latestEvent.venue}`
                  : "No completed rounds yet"}
              </p>
            </div>
          </section>

          {/* Sticky "Your Position" card — stays visible while scrolling
              the standings list below, so you never have to hunt for
              yourself in a list of hundreds. */}
          {currentUserEntry && currentUserPosition && (
            <div className="sticky top-4 z-20 mt-8">
              <Link
                href={`/leaderboard/${currentUserEntry.user_id}?season=${viewSeason}`}
                className="flex items-center gap-4 rounded-2xl border border-orange-500 bg-neutral-950/95 p-4 shadow-lg shadow-black/50 backdrop-blur transition hover:border-orange-400 sm:p-5"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${getPositionStyle(
                    currentUserPosition
                  )}`}
                >
                  {currentUserPosition}
                </div>

                <PlayerAvatar player={currentUserEntry} compact />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black sm:text-base">
                      {currentUserEntry.display_name}
                    </p>
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                      You
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {getPointsBehindLeader(currentUserEntry, leader)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-orange-500 sm:text-2xl">
                    {currentUserEntry.total_points}
                  </span>
                  <span className="ml-1 text-[10px] font-bold uppercase text-neutral-500">
                    pts
                  </span>
                </div>
              </Link>
            </div>
          )}

          {fullStandings.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-10 text-center">
              <h2 className="text-xl font-bold">No players yet</h2>

              <p className="mt-2 text-sm text-neutral-400">
                Players will appear here once their accounts are
                created.
              </p>
            </div>
          ) : (
            <section className="mt-10">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                    Full Field
                  </p>

                  <h2 className="mt-2 text-2xl font-black uppercase">
                    Championship Standings
                  </h2>
                </div>

                <form
                  method="get"
                  className="flex w-full max-w-xs items-center gap-2"
                >
                  {!isFocusSeason && (
                    <input type="hidden" name="season" value={viewSeason} />
                  )}
                  <input
                    type="search"
                    name="q"
                    defaultValue={params.q ?? ""}
                    placeholder="Search players…"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl border border-orange-500 px-4 py-2.5 text-sm font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
                  >
                    Search
                  </button>
                </form>
              </div>

              {searchQuery && (
                <p className="mt-4 text-sm text-neutral-400">
                  {searchedStandings.length} result
                  {searchedStandings.length === 1 ? "" : "s"} for &ldquo;
                  {params.q}&rdquo; ·{" "}
                  <Link
                    href={seasonBaseHref}
                    className="font-bold text-orange-500 hover:text-orange-400"
                  >
                    Clear search
                  </Link>
                </p>
              )}

              {/* Podium — top 3, only on the plain first-page view */}
              {podiumPlayers.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {podiumPlayers.map((player, index) => (
                    <Link
                      key={player.user_id}
                      href={`/leaderboard/${player.user_id}?season=${viewSeason}`}
                      className={`flex items-center gap-4 rounded-2xl border p-5 transition hover:border-orange-500 ${
                        index === 0
                          ? "border-orange-500/50 bg-orange-500/10 sm:order-2"
                          : index === 1
                            ? "border-neutral-700 bg-neutral-900 sm:order-1"
                            : "border-amber-800/50 bg-amber-900/10 sm:order-3"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${getPositionStyle(
                          index + 1
                        )}`}
                      >
                        {index + 1}
                      </div>

                      <PlayerAvatar player={player} compact />

                      <div className="min-w-0">
                        <p className="truncate font-black">
                          {player.display_name}
                        </p>
                        <p className="text-sm font-bold text-orange-500">
                          {player.total_points} pts
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
                <div className="hidden grid-cols-[40px_minmax(0,1fr)_80px_90px_80px] gap-4 border-b border-neutral-800 bg-black/30 px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-500 sm:grid">
                  <div>Pos</div>
                  <div>Player</div>
                  <div className="text-right">Points</div>
                  <div className="text-right">Last Rd</div>
                  <div className="text-right">Next Rd</div>
                </div>

                {pageStandings.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="font-bold text-neutral-400">
                      No players match &ldquo;{params.q}&rdquo;.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800">
                    {pageStandings.map((player) => (
                      <CompactPlayerRow
                        key={player.user_id}
                        player={player}
                      />
                    ))}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between gap-4">
                  <Link
                    href={buildPageHref(Math.max(1, safePage - 1))}
                    aria-disabled={safePage === 1}
                    className={`rounded-xl border px-5 py-2.5 text-sm font-black transition ${
                      safePage === 1
                        ? "pointer-events-none border-neutral-800 text-neutral-700"
                        : "border-neutral-700 text-white hover:border-orange-500 hover:text-orange-400"
                    }`}
                  >
                    ← Previous
                  </Link>

                  <p className="text-sm font-bold text-neutral-500">
                    Page {safePage} of {totalPages}
                  </p>

                  <Link
                    href={buildPageHref(Math.min(totalPages, safePage + 1))}
                    aria-disabled={safePage === totalPages}
                    className={`rounded-xl border px-5 py-2.5 text-sm font-black transition ${
                      safePage === totalPages
                        ? "pointer-events-none border-neutral-800 text-neutral-700"
                        : "border-neutral-700 text-white hover:border-orange-500 hover:text-orange-400"
                    }`}
                  >
                    Next →
                  </Link>
                </div>
              )}
            </section>
          )}
    </>
  );

  const firstEventOfSeason = viewSeasonEvents[0] ?? null;

  // A season with no scored rounds yet (e.g. 2027 before Anaheim 1)
  // shows a clear "not started" card instead of an empty table.
  const overallContent =
    fullStandings.length === 0 ? (
      <section className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
          {viewSeason} Season
        </p>

        <h2 className="mt-3 text-2xl font-black uppercase">
          {completedRounds === 0 && firstEventOfSeason?.status === "upcoming"
            ? "Season Not Started Yet"
            : "No Standings Yet"}
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-400">
          {firstEventOfSeason
            ? `Standings appear here once Round 1 is scored. The season opens with ${firstEventOfSeason.venue} on ${formatSeasonDate(
                firstEventOfSeason.race_date
              )}.`
            : "Standings will appear here once the first round has been scored."}
        </p>
      </section>
    ) : (
      standingsContent
    );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-12 sm:py-16">
          <Link
            href="/"
            className="inline-block text-sm font-bold text-neutral-400 transition hover:text-orange-500"
          >
            ← Back to Race Centre
          </Link>

          <header className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
              {championshipSeason} Racepicks
            </p>

            <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">
              Championship
            </h1>

            <p className="mt-3 text-sm text-neutral-400">
              Overall standings for the {viewSeason} season across all
              completed rounds
              {competitionsForTabs.length > 0
                ? ", or switch below to see a single competition\u2019s own leaderboard"
                : ""}
              .
            </p>
          </header>

          {seasonTiles.length > 1 && (
            <div className="mt-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                Seasons
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {seasonTiles.map((tile) => (
                  <Link
                    key={tile.season}
                    href={tile.href}
                    aria-current={tile.isViewed ? "page" : undefined}
                    className={`rounded-2xl border p-5 transition ${
                      tile.isViewed
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-neutral-800 bg-neutral-900 hover:border-orange-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-black">
                        {tile.season} Season
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tile.statusClass}`}
                      >
                        {tile.statusLabel}
                      </span>
                    </div>

                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-neutral-500">
                      {tile.detailLabel}
                    </p>

                    <p className="mt-1 font-black">{tile.detailValue}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <LeaderboardTabs
            key={viewSeason}
            competitions={competitionsForTabs}
            currentUserId={currentUserId}
            overallContent={overallContent}
          />
        </section>
      </div>
    </main>
  );
}