import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import TransferPicker from "./TransferPicker";
import { getCurrentTransferWindow } from "@/app/pro/lib/transferWindow";
import { hasMxSeasonConcluded } from "@/app/pro/lib/seasonStage";
import { getSalaryTrends } from "@/app/pro/lib/salaryTrend";

const SEASON = 2027;
const FACTORY_TOKEN_LIMIT = 3;
const CHALLENGER_TOKEN_LIMIT = 5;

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

export default async function TransferPage({
  params,
}: {
  params: Promise<{ riderId: string }>;
}) {
  const { riderId } = await params;
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
    redirect("/pro");
  }

  const { data: team } = await supabase
    .from("pro_teams")
    .select("id")
    .eq("user_id", user.id)
    .eq("season", SEASON)
    .maybeSingle();

  if (!team) {
    redirect("/pro/team");
  }

  const window = await getCurrentTransferWindow();

  if (!window.isOpen) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Navbar />
        </div>

        <div className="mx-auto max-w-2xl">
          <Link
            href="/pro/team"
            className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
          >
            ← Back to your team
          </Link>

          <div className="mt-6 rounded-3xl border border-orange-500/30 bg-orange-500/10 p-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
              Racepicks Pro
            </p>
            <h1 className="mt-4 text-3xl font-black uppercase">
              Transfers Are Closed
            </h1>
            <p className="mt-4 text-neutral-300">
              Transfers open every Monday and close when picks lock for
              the round, same as normal Racepicks.
            </p>
            {window.windowStart && (
              <p className="mt-4 rounded-2xl border border-neutral-800 bg-black p-4 text-sm text-neutral-400">
                Reopens {formatWindowDate(window.windowStart)}
              </p>
            )}
            <Link
              href="/pro/team"
              className="mt-6 inline-block rounded-full bg-orange-500 px-7 py-3 font-black text-black transition hover:bg-orange-400"
            >
              Back to Your Team
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: outgoingRow } = await supabase
    .from("pro_team_riders")
    .select("rider_id, classification_at_time, purchase_price, riders(full_name)")
    .eq("team_id", team.id)
    .eq("rider_id", riderId)
    .is("removed_at", null)
    .maybeSingle();

  if (!outgoingRow) {
    notFound();
  }

  const outgoingRiderInfo = Array.isArray(outgoingRow.riders)
    ? outgoingRow.riders[0]
    : outgoingRow.riders;

  const { data: outgoingSeasonRow } = await supabase
    .from("pro_rider_seasons")
    .select("current_salary, injury_transfer_eligible, smx_active")
    .eq("rider_id", riderId)
    .eq("season", SEASON)
    .maybeSingle();

  const mxConcluded = await hasMxSeasonConcluded(SEASON);

  const isFreeTransfer = Boolean(
    outgoingSeasonRow?.injury_transfer_eligible ||
      (mxConcluded && outgoingSeasonRow?.smx_active === false)
  );
  const freeTransferReason = outgoingSeasonRow?.injury_transfer_eligible
    ? "injury"
    : mxConcluded && outgoingSeasonRow?.smx_active === false
      ? "smx_non_qualification"
      : null;

  const { data: pastTransfers } = await supabase
    .from("pro_transfers")
    .select("factory_tokens_used, challenger_tokens_used")
    .eq("team_id", team.id)
    .eq("season", SEASON)
    .eq("is_free_transfer", false);

  const factoryUsed = (pastTransfers ?? []).reduce((sum, t) => sum + t.factory_tokens_used, 0);
  const challengerUsed = (pastTransfers ?? []).reduce(
    (sum, t) => sum + t.challenger_tokens_used,
    0
  );

  const tokensRemaining = {
    factory: FACTORY_TOKEN_LIMIT - factoryUsed,
    challenger: CHALLENGER_TOKEN_LIMIT - challengerUsed,
  };

  const { data: restOfRosterRows } = await supabase
    .from("pro_team_riders")
    .select("rider_id")
    .eq("team_id", team.id)
    .is("removed_at", null)
    .neq("rider_id", riderId);

  const restRiderIds = (restOfRosterRows ?? []).map((r) => r.rider_id);

  const { data: restSalaryRows } = await supabase
    .from("pro_rider_seasons")
    .select("current_salary")
    .eq("season", SEASON)
    .in("rider_id", restRiderIds.length > 0 ? restRiderIds : [""]);

  const restOfRosterValue = (restSalaryRows ?? []).reduce(
    (sum, r) => sum + (r.current_salary ?? 0),
    0
  );

  const currentRosterIds = new Set([...restRiderIds, riderId]);

  const { data: allSeasonRows } = await supabase
    .from("pro_rider_seasons")
    .select(
      "rider_id, sx_classification, mx_classification, smx_classification, current_salary, riders(full_name, race_number, pro_eligible)"
    )
    .eq("season", SEASON);

  const eligibleRidersBase = (allSeasonRows ?? [])
    .map((row) => {
      const riderInfo = Array.isArray(row.riders) ? row.riders[0] : row.riders;
      const classification =
        row.sx_classification || row.mx_classification || row.smx_classification;

      if (
        !riderInfo?.pro_eligible ||
        !classification ||
        !row.current_salary ||
        currentRosterIds.has(row.rider_id)
      ) {
        return null;
      }

      return {
        rider_id: row.rider_id,
        full_name: riderInfo.full_name,
        race_number: riderInfo.race_number,
        classification,
        salary: row.current_salary,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const trendsMap = await getSalaryTrends(
    eligibleRidersBase.map((r) => r.rider_id),
    SEASON
  );

  const eligibleRiders = eligibleRidersBase.map((r) => ({
    ...r,
    trend: trendsMap.get(r.rider_id) ?? { direction: "none" as const, changePercent: null },
  }));

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Navbar />
      </div>

      <div className="mx-auto max-w-3xl">
        <Link
          href="/pro/team"
          className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to your team
        </Link>

        <header className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Racepicks Pro · {SEASON}
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
            Transfer Rider
          </h1>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Factory Tokens
            </p>
            <p className="mt-1 text-xl font-black text-orange-500">
              {tokensRemaining.factory} / {FACTORY_TOKEN_LIMIT}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Challenger Tokens
            </p>
            <p className="mt-1 text-xl font-black text-orange-500">
              {tokensRemaining.challenger} / {CHALLENGER_TOKEN_LIMIT}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <TransferPicker
            teamId={team.id}
            season={SEASON}
            outgoingRider={{
              rider_id: riderId,
              full_name: outgoingRiderInfo?.full_name ?? "Unknown rider",
              classification: outgoingRow.classification_at_time,
              salary: outgoingSeasonRow?.current_salary ?? outgoingRow.purchase_price,
            }}
            restOfRosterValue={restOfRosterValue}
            tokensRemaining={tokensRemaining}
            isFreeTransfer={isFreeTransfer}
            freeTransferReason={freeTransferReason}
            eligibleRiders={eligibleRiders}
          />
        </div>
      </div>
    </main>
  );
}