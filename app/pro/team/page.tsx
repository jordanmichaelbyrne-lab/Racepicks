import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import TeamBuilder from "./TeamBuilder";
import SeasonProgression from "./SeasonProgression";
import RiderTrendSparkline from "./RiderTrendSparkline";
import { getCurrentTransferWindow } from "@/app/pro/lib/transferWindow";
import { hasMxSeasonConcluded } from "@/app/pro/lib/seasonStage";
import { getSalaryTrends } from "@/app/pro/lib/salaryTrend";
import { getRiderRoundHistories } from "@/app/pro/lib/riderHistory";
import { getTeamRankHistory } from "@/app/pro/lib/leagueRankHistory";

const SEASON = 2027;

function formatWindowDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(date);
}

export default async function ProTeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("pro_access")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.pro_access) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Navbar />
        </div>

        <div className="mx-auto mt-16 max-w-2xl">
          <div className="rounded-3xl border border-orange-500/30 bg-orange-500/10 p-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
              Racepicks Pro
            </p>
            <h1 className="mt-4 text-3xl font-black uppercase">
              Pro Access Required
            </h1>
            <p className="mt-4 text-neutral-300">
              You need Racepicks Pro access to build a team. Racepicks
              Pro is still being tested ahead of the {SEASON} season —
              subscriptions aren&apos;t live yet.
            </p>
            <Link
              href="/pro"
              className="mt-6 inline-block rounded-full bg-orange-500 px-7 py-3 font-black text-black transition hover:bg-orange-400"
            >
              Back to Racepicks Pro
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: existingTeam } = await supabase
    .from("pro_teams")
    .select("id, team_name, manufacturer, created_at")
    .eq("user_id", user.id)
    .eq("season", SEASON)
    .maybeSingle();

  if (existingTeam) {
    const { data: rosterRows } = await supabase
      .from("pro_team_riders")
      .select("rider_id, classification_at_time, purchase_price, riders(full_name, race_number)")
      .eq("team_id", existingTeam.id)
      .is("removed_at", null);

    const roster = (rosterRows ?? []).map((row) => {
      const rider = Array.isArray(row.riders) ? row.riders[0] : row.riders;
      return {
        riderId: row.rider_id,
        name: rider?.full_name ?? "Unknown rider",
        raceNumber: rider?.race_number ?? null,
        classification: row.classification_at_time,
        purchasePrice: row.purchase_price,
      };
    });

    const rosterRiderIds = roster.map((r) => r.riderId);

    // Current salaries, for movement-since-purchase.
    const { data: currentSalaryRows } = await supabase
      .from("pro_rider_seasons")
      .select("rider_id, current_salary")
      .eq("season", SEASON)
      .in("rider_id", rosterRiderIds.length > 0 ? rosterRiderIds : [""]);

    const currentSalaryByRiderId = new Map(
      (currentSalaryRows ?? []).map((r) => [r.rider_id, r.current_salary])
    );

    // Every round score for this team's riders — powers both the
    // per-rider "points scored" total and the per-rider trend line.
    const { data: riderScoreRows } = await supabase
      .from("pro_round_scores")
      .select("rider_id, event_id, total_points")
      .in("rider_id", rosterRiderIds.length > 0 ? rosterRiderIds : [""]);

    const pointsByRiderId = new Map<string, number>();
    for (const row of riderScoreRows ?? []) {
      pointsByRiderId.set(row.rider_id, (pointsByRiderId.get(row.rider_id) ?? 0) + row.total_points);
    }

    // Ordered per-round score history, per rider — powers the
    // sparkline + slump detection on each roster row.
    const riderRoundHistories = await getRiderRoundHistories(rosterRiderIds, SEASON);

    // Team's cumulative season total + league rank AT EACH ROUND —
    // powers the season progression chart.
    const teamRankHistory = await getTeamRankHistory(existingTeam.id, SEASON);

    const seasonTotal =
      teamRankHistory.length > 0
        ? teamRankHistory[teamRankHistory.length - 1].cumulativePoints
        : 0;

    const totalValue = roster.reduce(
      (sum, r) => sum + (currentSalaryByRiderId.get(r.riderId) ?? r.purchasePrice),
      0
    );
    const factoryCount = roster.filter((r) => r.classification === "factory").length;
    const challengerCount = roster.filter((r) => r.classification === "challenger").length;

    // Transfer tokens remaining.
    const { data: pastTransfers } = await supabase
      .from("pro_transfers")
      .select("factory_tokens_used, challenger_tokens_used")
      .eq("team_id", existingTeam.id)
      .eq("season", SEASON)
      .eq("is_free_transfer", false);

    const factoryUsed = (pastTransfers ?? []).reduce((sum, t) => sum + t.factory_tokens_used, 0);
    const challengerUsed = (pastTransfers ?? []).reduce(
      (sum, t) => sum + t.challenger_tokens_used,
      0
    );
    const factoryTokensRemaining = 3 - factoryUsed;
    const challengerTokensRemaining = 5 - challengerUsed;

    const transferWindow = await getCurrentTransferWindow();
    const salaryTrends = await getSalaryTrends(rosterRiderIds, SEASON);

    // Free-transfer eligibility per roster rider.
    const mxConcluded = await hasMxSeasonConcluded(SEASON);

    const { data: rosterSeasonRows } = await supabase
      .from("pro_rider_seasons")
      .select("rider_id, injury_transfer_eligible, smx_active")
      .eq("season", SEASON)
      .in("rider_id", rosterRiderIds.length > 0 ? rosterRiderIds : [""]);

    const freeTransferByRiderId = new Map<string, string>();
    for (const row of rosterSeasonRows ?? []) {
      if (row.injury_transfer_eligible) {
        freeTransferByRiderId.set(row.rider_id, "injury");
      } else if (mxConcluded && row.smx_active === false) {
        freeTransferByRiderId.set(row.rider_id, "smx_non_qualification");
      }
    }

    // League position — from the same rank history used by the chart,
    // so the top stat card and the chart's final point always agree.
    const leaguePosition =
      teamRankHistory.length > 0 ? teamRankHistory[teamRankHistory.length - 1].rank : 0;
    const leagueSize =
      teamRankHistory.length > 0 ? teamRankHistory[teamRankHistory.length - 1].leagueSize : 0;

    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Navbar />
        </div>

        <div className="mx-auto max-w-3xl">
          <header className="mt-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                Racepicks Pro · {SEASON}
              </p>
              <h1 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
                {existingTeam.team_name || "Your Team"}
              </h1>
            </div>
            <Link
              href="/pro/leaderboard"
              className="rounded-full border border-orange-500 px-5 py-2 text-sm font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
            >
              Leaderboard →
            </Link>
          </header>

          {/* Top stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Team Value
              </p>
              <p className="mt-2 text-2xl font-black text-orange-500">
                ${totalValue.toFixed(1)}M
              </p>
              <p className="mt-1 text-xs text-neutral-600">of $31.0M cap</p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Season Points
              </p>
              <p className="mt-2 text-2xl font-black text-orange-500">{seasonTotal}</p>
              <p className="mt-1 text-xs text-neutral-600">{teamRankHistory.length} round(s) scored</p>
            </div>
            <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                League Position
              </p>
              <p className="mt-2 text-2xl font-black text-orange-400">
                {leagueSize > 0 ? `${leaguePosition} / ${leagueSize}` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Structure
              </p>
              <p className="mt-2 text-2xl font-black">
                {factoryCount}F / {challengerCount}C
              </p>
              <p className="mt-1 text-xs text-orange-500">{existingTeam.manufacturer}</p>
            </div>
          </div>

          {/* Transfer tokens */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Factory Tokens
              </p>
              <p className="mt-1 text-xl font-black text-orange-500">
                {factoryTokensRemaining} / 3
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Challenger Tokens
              </p>
              <p className="mt-1 text-xl font-black text-orange-500">
                {challengerTokensRemaining} / 5
              </p>
            </div>
          </div>

          {/* Transfer window status */}
          <div
            className={`mt-4 rounded-2xl border p-4 text-center ${
              transferWindow.isOpen
                ? "border-green-500/40 bg-green-500/10"
                : "border-neutral-800 bg-neutral-950"
            }`}
          >
            {transferWindow.isOpen ? (
              <p className="text-sm font-black text-green-400">
                ✓ Transfers are open — closes {transferWindow.windowEnd ? formatWindowDate(transferWindow.windowEnd) : "soon"}
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                Transfers are closed
                {transferWindow.windowStart
                  ? ` — reopens ${formatWindowDate(transferWindow.windowStart)}`
                  : ""}
              </p>
            )}
          </div>

          {/* Season progression chart — cumulative total + league rank per round */}
          <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
              Season Progression
            </p>
            <SeasonProgression rounds={teamRankHistory} />
          </section>

          {/* Roster with salary movement + per-rider trend/slump */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
            <div className="border-b border-neutral-800 px-6 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
                Your Roster
              </p>
            </div>
            <div className="divide-y divide-neutral-800">
              {roster.map((r) => {
                const currentSalary = currentSalaryByRiderId.get(r.riderId) ?? r.purchasePrice;
                const change = currentSalary - r.purchasePrice;
                const changePct = r.purchasePrice ? (change / r.purchasePrice) * 100 : 0;
                const pointsScored = pointsByRiderId.get(r.riderId) ?? 0;
                const freeTransferReason = freeTransferByRiderId.get(r.riderId);
                const roundHistory = riderRoundHistories.get(r.riderId) ?? [];

                return (
                  <div key={r.riderId} className="px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-neutral-500">#{r.raceNumber ?? "—"}</span>
                        <div>
                          <p className="font-black">{r.name}</p>
                          <span
                            className={`text-xs font-bold uppercase ${
                              r.classification === "factory" ? "text-neutral-400" : "text-orange-400"
                            }`}
                          >
                            {r.classification}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5 text-right">
                        <div>
                          <p className="text-xs text-neutral-500">Points</p>
                          <p className="font-black text-orange-500">{pointsScored}</p>
                        </div>

                        <RiderTrendSparkline history={roundHistory} />

                        <div>
                          <p className="text-xs text-neutral-500">Salary</p>
                          <div className="flex items-center justify-end gap-2">
                            <p className="font-black">${currentSalary.toFixed(1)}M</p>
                            {(() => {
                              const trend = salaryTrends.get(r.riderId);
                              if (!trend || trend.direction === "none") {
                                return (
                                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                                    —
                                  </span>
                                );
                              }
                              if (trend.direction === "flat") {
                                return (
                                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                                    0.0%
                                  </span>
                                );
                              }
                              const isUp = trend.direction === "up";
                              return (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                    isUp
                                      ? "bg-green-500/15 text-green-400"
                                      : "bg-red-500/15 text-red-400"
                                  }`}
                                >
                                  {isUp ? "▲" : "▼"} {Math.abs(trend.changePercent ?? 0).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </div>
                          {change !== 0 && (
                            <p
                              className={`text-xs font-bold ${
                                change > 0 ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {change > 0 ? "+" : ""}
                              {changePct.toFixed(1)}% since purchase
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/pro/team/transfer/${r.riderId}`}
                          className="rounded-full border border-orange-500 px-4 py-2 text-xs font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
                        >
                          Transfer
                        </Link>
                      </div>
                    </div>

                    {freeTransferReason && (
                      <div className="mt-3 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-2">
                        <p className="text-xs font-black text-green-400">
                          🎁 Free Transfer Available —{" "}
                          {freeTransferReason === "injury"
                            ? "confirmed injury"
                            : "didn't qualify for SMX Playoffs"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-8 text-center">
            <Link
              href="/pro"
              className="inline-flex items-center gap-2 font-black text-zinc-400 transition hover:text-orange-500"
            >
              <span>←</span>
              <span>Back to Racepicks Pro</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: eligibleSeasonRows, error: seasonRowsError } = await supabase
    .from("pro_rider_seasons")
    .select(
      "rider_id, sx_classification, mx_classification, smx_classification, current_salary, manufacturer, riders(full_name, race_number, pro_eligible)"
    )
    .eq("season", SEASON);

  if (seasonRowsError) {
    throw new Error(seasonRowsError.message);
  }

  const ridersBase = (eligibleSeasonRows ?? [])
    .map((row) => {
      const riderInfo = Array.isArray(row.riders) ? row.riders[0] : row.riders;
      const classification =
        row.sx_classification || row.mx_classification || row.smx_classification;

      if (!riderInfo?.pro_eligible || !classification || !row.current_salary) {
        return null;
      }

      return {
        rider_id: row.rider_id,
        full_name: riderInfo.full_name,
        race_number: riderInfo.race_number,
        classification,
        salary: row.current_salary,
        manufacturer: row.manufacturer,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const builderTrends = await getSalaryTrends(
    ridersBase.map((r) => r.rider_id),
    SEASON
  );

  const riders = ridersBase.map((r) => ({
    ...r,
    trend: builderTrends.get(r.rider_id) ?? { direction: "none" as const, changePercent: null },
  }));

  const { data: manufacturerRows } = await supabase
    .from("pro_manufacturer_tiers")
    .select("manufacturer, tier")
    .order("manufacturer", { ascending: true });

  const manufacturers = (manufacturerRows ?? []).map((m) => m.manufacturer);

  const manufacturersByTier: Record<string, string[]> = {};
  for (const row of manufacturerRows ?? []) {
    if (!manufacturersByTier[row.tier]) manufacturersByTier[row.tier] = [];
    manufacturersByTier[row.tier].push(row.manufacturer);
  }

  const { data: bonusRows } = await supabase
    .from("pro_manufacturer_bonus")
    .select("manufacturer_tier, min_position, max_position, bonus_points")
    .order("manufacturer_tier", { ascending: true })
    .order("min_position", { ascending: true });

  const bonusTable = (bonusRows ?? []).map((row) => ({
    tier: row.manufacturer_tier,
    minPosition: row.min_position,
    maxPosition: row.max_position,
    bonusPoints: row.bonus_points,
  }));

  const { data: challengerBonusRows } = await supabase
    .from("pro_challenger_bonus")
    .select("result_type, min_position, max_position, bonus_points")
    .order("result_type", { ascending: true })
    .order("min_position", { ascending: true });

  const challengerBonusTable = (challengerBonusRows ?? []).map((row) => ({
    resultType: row.result_type,
    minPosition: row.min_position,
    maxPosition: row.max_position,
    bonusPoints: row.bonus_points,
  }));

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Navbar />
      </div>

      <div className="mx-auto max-w-4xl">
        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Racepicks Pro · {SEASON}
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
            Build Your Team
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral-400">
            5 riders, $31.0M cap, 2-3 Factory and 2-3 Challenger. Pick your
            manufacturer too — it&apos;s locked for the season once you save.
          </p>
        </header>

        {riders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-8 text-center">
            <p className="font-black text-orange-300">
              Racepicks Pro rider data isn&apos;t ready yet.
            </p>
            <p className="mt-2 text-sm text-orange-200/70">
              Check back once the {SEASON} rider pool is fully configured.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <TeamBuilder
              riders={riders}
              season={SEASON}
              manufacturers={manufacturers}
              manufacturersByTier={manufacturersByTier}
              bonusTable={bonusTable}
              challengerBonusTable={challengerBonusTable}
            />
          </div>
        )}
      </div>
    </main>
  );
}