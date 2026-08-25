import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import AdminSubmitButton from "../components/AdminSubmitButton";
import { importProRidersCsv } from "./import-actions";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
  pro_eligible: boolean;
};

type ProSeasonRow = {
  rider_id: string;
  sx_classification: string | null;
  mx_classification: string | null;
  smx_classification: string | null;
  salary_category: string | null;
  current_salary: number | null;
};

type PageProps = {
  searchParams: Promise<{
    season?: string;
    view?: string;
    q?: string;
    imported?: string;
    salaryChanges?: string;
    errors?: string;
  }>;
};

const SALARY_CATEGORY_LABELS: Record<string, string> = {
  championship_favourite: "Championship Favourite",
  elite: "Elite",
  podium_threat: "Podium Threat",
  strong_factory: "Strong Factory",
  mid_factory_elite_challenger: "Mid Factory / Elite Challenger",
  strong_challenger: "Strong Challenger",
  mid_challenger: "Mid Challenger",
  lower_field_occasional: "Lower Field / Occasional",
};

function ClassBadge({ label }: { label: string | null }) {
  if (!label) {
    return (
      <span className="rounded-full border border-zinc-800 bg-black px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-600">
        —
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
        label === "factory"
          ? "bg-zinc-700 text-white"
          : "bg-orange-500/20 text-orange-400"
      }`}
    >
      {label}
    </span>
  );
}

export default async function ProRidersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const season = Number.parseInt(params.season ?? "2027", 10) || 2027;
  const view = params.view === "all" ? "all" : "needs-setup";
  const searchQuery = (params.q ?? "").trim().toLowerCase();

  const { data: riderData, error: ridersError } = await supabase
    .from("riders")
    .select(
      "id, full_name, race_number, team_name, manufacturer, pro_eligible"
    )
    .eq("is_active", true)
    .eq("class_name", "450")
    .order("race_number", { ascending: true });

  if (ridersError) {
    throw new Error(ridersError.message);
  }

  const riders = (riderData ?? []) as Rider[];

  const { data: seasonData, error: seasonError } = await supabase
    .from("pro_rider_seasons")
    .select(
      "rider_id, sx_classification, mx_classification, smx_classification, salary_category, current_salary"
    )
    .eq("season", season);

  if (seasonError) {
    throw new Error(seasonError.message);
  }

  const seasonByRiderId = new Map(
    ((seasonData ?? []) as ProSeasonRow[]).map((row) => [row.rider_id, row])
  );

  const ridersWithStatus = riders.map((rider) => {
    const seasonRow = seasonByRiderId.get(rider.id) ?? null;

    return {
      rider,
      seasonRow,
      needsSetup: !seasonRow,
    };
  });

  const needsSetupCount = ridersWithStatus.filter((r) => r.needsSetup).length;

  let visibleRiders = ridersWithStatus;

  if (view === "needs-setup") {
    visibleRiders = visibleRiders.filter((r) => r.needsSetup);
  }

  if (searchQuery) {
    visibleRiders = visibleRiders.filter((r) =>
      r.rider.full_name.toLowerCase().includes(searchQuery)
    );
  }

  function buildHref(overrides: { view?: string; q?: string }) {
    const qp = new URLSearchParams();
    qp.set("season", String(season));

    const nextView = overrides.view ?? view;
    if (nextView !== "needs-setup") {
      qp.set("view", nextView);
    }

    const nextQ = overrides.q !== undefined ? overrides.q : params.q;
    if (nextQ) {
      qp.set("q", nextQ);
    }

    return `/admin/pro-riders?${qp.toString()}`;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Navbar />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
          >
            ← Back to admin dashboard
          </Link>

          <Link
            href={`/admin/pro-results?season=${season}`}
            className="rounded-full border border-orange-500 px-5 py-2 text-sm font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
          >
            Pro Results Entry →
          </Link>
        </div>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Race Control · Racepicks Pro
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase sm:text-6xl">
            Pro Rider Manager
          </h1>

          <p className="mt-3 text-sm text-neutral-400">
            Configure Factory/Challenger classification, salary, and
            availability for each rider, per season.
          </p>
        </header>

        {needsSetupCount > 0 && (
          <div className="mt-8 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5">
            <p className="font-black text-orange-300">
              ⚠️ {needsSetupCount} rider{needsSetupCount === 1 ? "" : "s"}{" "}
              need{needsSetupCount === 1 ? "s" : ""} Pro setup for {season}
            </p>
            <p className="mt-1 text-sm text-orange-200/70">
              These riders have no Pro configuration yet — likely new
              imports from a recent Racer X entry-list update.
            </p>
          </div>
        )}

        {needsSetupCount === 0 && view === "needs-setup" && (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
            <p className="font-black text-green-400">
              ✓ Every active 450 rider has Pro setup for {season}
            </p>
          </div>
        )}

        {params.imported && (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
            <p className="font-black text-green-400">
              ✓ Imported {params.imported} rider(s)
              {params.salaryChanges && Number(params.salaryChanges) > 0
                ? ` — ${params.salaryChanges} salary change(s) logged to history`
                : ""}
            </p>
          </div>
        )}

        {params.errors && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="font-black text-red-400">Some rows had issues:</p>
            <p className="mt-1 text-sm text-red-300/80">{params.errors}</p>
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-white">Bulk Setup via CSV</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Export the current list, fill it in via Excel, then
                re-upload — faster than editing riders one at a time.
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href={`/admin/pro-riders/export?season=${season}`}
                className="rounded-xl border border-orange-500 px-5 py-3 text-sm font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
              >
                Export CSV
              </a>
            </div>
          </div>

          <form
            action={importProRidersCsv}
            className="mt-5 flex flex-col gap-3 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center"
          >
            <input type="hidden" name="season" value={season} />
            <input
              type="file"
              name="csv_file"
              accept=".csv"
              required
              className="flex-1 rounded-xl border border-neutral-700 bg-black px-4 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:font-black file:text-black"
            />
            <AdminSubmitButton
              pendingText="Importing riders…"
              className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-400"
            >
              Import CSV
            </AdminSubmitButton>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Link
                href={buildHref({ view: "needs-setup" })}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  view === "needs-setup"
                    ? "bg-orange-500 text-black"
                    : "border border-neutral-700 text-neutral-300 hover:border-orange-500"
                }`}
              >
                Needs Setup {needsSetupCount > 0 ? `(${needsSetupCount})` : ""}
              </Link>

              <Link
                href={buildHref({ view: "all" })}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  view === "all"
                    ? "bg-orange-500 text-black"
                    : "border border-neutral-700 text-neutral-300 hover:border-orange-500"
                }`}
              >
                All Riders ({riders.length})
              </Link>
            </div>

            <form method="get" className="flex gap-2">
              <input type="hidden" name="season" value={season} />
              <input type="hidden" name="view" value={view} />
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search riders…"
                className="rounded-xl border border-neutral-700 bg-black px-4 py-2 text-sm text-white outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="rounded-xl border border-orange-500 px-4 py-2 text-sm font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
          <div className="hidden grid-cols-[60px_1fr_140px_100px_100px_100px_150px_100px_80px] gap-3 border-b border-neutral-800 bg-black/40 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-neutral-500 md:grid">
            <div>#</div>
            <div>Rider</div>
            <div>Team</div>
            <div>SX</div>
            <div>MX</div>
            <div>SMX</div>
            <div>Category</div>
            <div className="text-right">Salary</div>
            <div className="text-right">Edit</div>
          </div>

          {visibleRiders.length === 0 ? (
            <div className="p-10 text-center text-neutral-500">
              No riders match this view.
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {visibleRiders.map(({ rider, seasonRow, needsSetup }) => (
                <div
                  key={rider.id}
                  className="grid grid-cols-[40px_1fr_80px] items-center gap-3 px-5 py-4 md:grid-cols-[60px_1fr_140px_100px_100px_100px_150px_100px_80px]"
                >
                  <div className="font-black text-neutral-400">
                    #{rider.race_number ?? "—"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-black">{rider.full_name}</p>
                    {needsSetup && (
                      <span className="mt-1 inline-block rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-orange-400">
                        Needs Setup
                      </span>
                    )}
                  </div>

                  <div className="hidden truncate text-sm text-neutral-500 md:block">
                    {rider.team_name ?? rider.manufacturer ?? "—"}
                  </div>

                  <div className="hidden md:block">
                    <ClassBadge label={seasonRow?.sx_classification ?? null} />
                  </div>
                  <div className="hidden md:block">
                    <ClassBadge label={seasonRow?.mx_classification ?? null} />
                  </div>
                  <div className="hidden md:block">
                    <ClassBadge label={seasonRow?.smx_classification ?? null} />
                  </div>

                  <div className="hidden truncate text-xs text-neutral-400 md:block">
                    {seasonRow?.salary_category
                      ? SALARY_CATEGORY_LABELS[seasonRow.salary_category] ??
                        seasonRow.salary_category
                      : "—"}
                  </div>

                  <div className="hidden text-right font-black text-orange-500 md:block">
                    {seasonRow?.current_salary
                      ? `$${seasonRow.current_salary}M`
                      : "—"}
                  </div>

                  <div className="text-right">
                    <Link
                      href={`/admin/pro-riders/${rider.id}?season=${season}`}
                      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-black transition hover:border-orange-500 hover:text-orange-500"
                    >
                      {needsSetup ? "Set Up" : "Edit"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}