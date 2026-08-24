import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AdminSubmitButton from "@/app/admin/components/AdminSubmitButton";
import { saveProRiderSeason } from "./actions";

type PageProps = {
  params: Promise<{ riderId: string }>;
  searchParams: Promise<{ season?: string }>;
};

const SALARY_CATEGORIES = [
  { value: "championship_favourite", label: "Championship Favourite" },
  { value: "elite", label: "Elite" },
  { value: "podium_threat", label: "Podium Threat" },
  { value: "strong_factory", label: "Strong Factory" },
  { value: "mid_factory_elite_challenger", label: "Mid Factory / Elite Challenger" },
  { value: "strong_challenger", label: "Strong Challenger" },
  { value: "mid_challenger", label: "Mid Challenger" },
  { value: "lower_field_occasional", label: "Lower Field / Occasional" },
];

export default async function ProRiderEditPage({
  params,
  searchParams,
}: PageProps) {
  const { riderId } = await params;
  const { season: seasonParam } = await searchParams;
  const season = Number.parseInt(seasonParam ?? "2027", 10) || 2027;

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

  const { data: rider, error: riderError } = await supabase
    .from("riders")
    .select("id, full_name, race_number, team_name, manufacturer, pro_eligible")
    .eq("id", riderId)
    .single();

  if (riderError || !rider) {
    throw new Error(riderError?.message ?? "Rider not found.");
  }

  const { data: seasonRow } = await supabase
    .from("pro_rider_seasons")
    .select("*")
    .eq("rider_id", riderId)
    .eq("season", season)
    .maybeSingle();

  const { data: salaryHistory } = await supabase
    .from("pro_salary_history")
    .select("old_salary, new_salary, change_percent, effective_at")
    .eq("rider_id", riderId)
    .eq("season", season)
    .order("effective_at", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/admin/pro-riders?season=${season}`}
          className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to Pro Rider Manager
        </Link>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            {season} Season · Racepicks Pro
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
            #{rider.race_number ?? "—"} {rider.full_name}
          </h1>

          <p className="mt-2 text-sm text-neutral-400">
            {rider.team_name ?? "No team listed"}
            {rider.manufacturer ? ` · ${rider.manufacturer}` : ""}
          </p>
        </header>

        <form
          action={saveProRiderSeason}
          className="mt-8 space-y-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8"
        >
          <input type="hidden" name="rider_id" value={rider.id} />
          <input type="hidden" name="season" value={season} />

          <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-black p-4">
            <input
              type="checkbox"
              id="pro_eligible"
              name="pro_eligible"
              defaultChecked={rider.pro_eligible}
              className="h-5 w-5 accent-orange-500"
            />
            <label htmlFor="pro_eligible" className="font-black">
              Rider is eligible for Racepicks Pro
            </label>
          </div>

          <section>
            <h2 className="text-lg font-black uppercase text-orange-500">
              Manufacturer
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Locked for this Pro season specifically — updating this
              rider&apos;s manufacturer in the regular Rider Manager
              later (e.g. for a new season) won&apos;t change this
              value retroactively.
            </p>

            <input
              type="text"
              name="manufacturer"
              defaultValue={seasonRow?.manufacturer ?? rider.manufacturer ?? ""}
              placeholder="e.g. Honda"
              className="mt-3 w-full rounded-xl border border-neutral-700 bg-black px-3 py-3 font-bold outline-none focus:border-orange-500"
            />

            {!seasonRow?.manufacturer && rider.manufacturer && (
              <p className="mt-2 text-xs text-orange-400">
                Auto-filled from this rider&apos;s current manufacturer
                ({rider.manufacturer}). Save to lock it in for {season}.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-black uppercase text-orange-500">
              Classification — per stage
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Freezes before each stage begins — a rider can be Challenger
              for SX and Factory for MX in the same season.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {(["sx", "mx", "smx"] as const).map((stage) => (
                <div key={stage}>
                  <label
                    htmlFor={`${stage}_classification`}
                    className="text-xs font-bold uppercase tracking-widest text-neutral-500"
                  >
                    {stage.toUpperCase()}
                  </label>
                  <select
                    id={`${stage}_classification`}
                    name={`${stage}_classification`}
                    defaultValue={
                      seasonRow?.[`${stage}_classification`] ?? ""
                    }
                    className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-3 py-3 font-bold outline-none focus:border-orange-500"
                  >
                    <option value="">Not set</option>
                    <option value="factory">Factory</option>
                    <option value="challenger">Challenger</option>
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase text-orange-500">
              Salary
            </h2>

            <div className="mt-4">
              <label
                htmlFor="salary_category"
                className="text-xs font-bold uppercase tracking-widest text-neutral-500"
              >
                Category
              </label>
              <select
                id="salary_category"
                name="salary_category"
                defaultValue={seasonRow?.salary_category ?? ""}
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-3 py-3 font-bold outline-none focus:border-orange-500"
              >
                <option value="">Not set</option>
                {SALARY_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="starting_salary"
                  className="text-xs font-bold uppercase tracking-widest text-neutral-500"
                >
                  Starting Salary ($M)
                </label>
                <input
                  id="starting_salary"
                  name="starting_salary"
                  type="number"
                  step="0.1"
                  defaultValue={seasonRow?.starting_salary ?? ""}
                  placeholder="e.g. 10.5"
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-3 py-3 font-bold outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label
                  htmlFor="current_salary"
                  className="text-xs font-bold uppercase tracking-widest text-neutral-500"
                >
                  Current Salary ($M)
                </label>
                <input
                  id="current_salary"
                  name="current_salary"
                  type="number"
                  step="0.1"
                  defaultValue={seasonRow?.current_salary ?? ""}
                  placeholder="e.g. 10.8"
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-3 py-3 font-bold outline-none focus:border-orange-500"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Changing this from its current saved value will log an
                  entry to the salary history automatically.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase text-orange-500">
              Discipline Availability
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["sx", "mx", "smx"] as const).map((stage) => (
                <label
                  key={stage}
                  htmlFor={`${stage}_active`}
                  className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-black p-4"
                >
                  <input
                    type="checkbox"
                    id={`${stage}_active`}
                    name={`${stage}_active`}
                    defaultChecked={seasonRow?.[`${stage}_active`] ?? true}
                    className="h-5 w-5 accent-orange-500"
                  />
                  <span className="font-black">{stage.toUpperCase()} Active</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase text-orange-500">
              Injury Status
            </h2>

            <div className="mt-4">
              <select
                name="injury_status"
                defaultValue={seasonRow?.injury_status ?? "healthy"}
                className="w-full rounded-xl border border-neutral-700 bg-black px-3 py-3 font-bold outline-none focus:border-orange-500"
              >
                <option value="healthy">Healthy</option>
                <option value="injured">Injured</option>
                <option value="injured_transfer_eligible">
                  Injured — Free Transfer Eligible
                </option>
              </select>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                id="injury_transfer_eligible"
                name="injury_transfer_eligible"
                defaultChecked={seasonRow?.injury_transfer_eligible ?? false}
                className="h-5 w-5 accent-orange-500"
              />
              <label htmlFor="injury_transfer_eligible" className="text-sm font-bold">
                Confirm this rider qualifies for a free injury transfer
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase text-orange-500">
              Admin Notes
            </h2>
            <textarea
              name="admin_notes"
              defaultValue={seasonRow?.admin_notes ?? ""}
              rows={3}
              placeholder="Internal notes — not shown to players"
              className="mt-3 w-full rounded-xl border border-neutral-700 bg-black px-3 py-3 outline-none focus:border-orange-500"
            />
          </section>

          <AdminSubmitButton
            pendingText="Saving…"
            className="w-full rounded-xl bg-orange-500 px-7 py-4 font-black uppercase text-black transition hover:bg-orange-400"
          >
            Save Rider Configuration
          </AdminSubmitButton>
        </form>

        {salaryHistory && salaryHistory.length > 0 && (
          <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <h2 className="text-lg font-black uppercase text-orange-500">
              Salary History
            </h2>

            <div className="mt-4 divide-y divide-neutral-800">
              {salaryHistory.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-neutral-400">
                    {new Intl.DateTimeFormat("en-AU", {
                      dateStyle: "medium",
                    }).format(new Date(entry.effective_at))}
                  </span>
                  <span className="font-bold">
                    ${entry.old_salary}M → ${entry.new_salary}M
                  </span>
                  <span
                    className={
                      (entry.change_percent ?? 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {(entry.change_percent ?? 0) >= 0 ? "+" : ""}
                    {entry.change_percent}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}