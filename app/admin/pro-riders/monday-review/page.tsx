import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import MondayReviewClient from "./MondayReviewClient";

type PageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default async function MondaySalaryReviewPage({
  searchParams,
}: PageProps) {
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

  const { data: riders, error: ridersError } = await supabase
    .from("riders")
    .select("id, full_name, race_number, pro_eligible")
    .eq("pro_eligible", true)
    .eq("is_active", true)
    .order("race_number", { ascending: true });

  if (ridersError) {
    throw new Error(ridersError.message);
  }

  const riderIds = (riders ?? []).map((r) => r.id);

  const { data: seasonRows, error: seasonError } = await supabase
    .from("pro_rider_seasons")
    .select("rider_id, current_salary, suggested_salary")
    .eq("season", season)
    .in("rider_id", riderIds);

  if (seasonError) {
    throw new Error(seasonError.message);
  }

  const seasonByRiderId = new Map(
    (seasonRows ?? []).map((row) => [row.rider_id, row])
  );

  const initialRiders = (riders ?? []).map((rider) => {
    const seasonRow = seasonByRiderId.get(rider.id);
    return {
      rider_id: rider.id,
      full_name: rider.full_name,
      race_number: rider.race_number,
      current_salary: seasonRow?.current_salary ?? null,
      suggested_salary: seasonRow?.suggested_salary ?? null,
    };
  });

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/admin/pro-riders?season=${season}`}
          className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to Pro Rider Manager
        </Link>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Race Control · Racepicks Pro
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
            Monday Salary Review
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-neutral-400">
            Type a suggested price for each rider, then Accept or Skip.
            Accepted changes are logged permanently to salary history.
            Changes over ±5% will ask you to confirm.
          </p>
        </header>

        <div className="mt-8">
          <MondayReviewClient initialRiders={initialRiders} season={season} />
        </div>
      </div>
    </main>
  );
}