import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/app/lib/supabase/server";
import { importChampionshipStandings } from "./actions";

type Standing = {
  id: string;
  season: number;
  series: string;
  class_name: string;
  position: number;
  rider_name: string;
  race_number: number | null;
  manufacturer: string | null;
  points: number;
  source_url: string | null;
  updated_at: string;
};

type PageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
    count?: string;
    season?: string;
    series?: string;
  }>;
};

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

export default async function AdminStandingsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/");
  }

  const { data: latestStandingData, error: latestError } =
    await supabase
      .from("championship_standings")
      .select(
        `
          season,
          series,
          class_name,
          updated_at,
          source_url
        `
      )
      .eq("class_name", "450")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestError) {
    throw new Error(latestError.message);
  }

  let standings: Standing[] = [];

  if (latestStandingData) {
    const { data, error } = await supabase
      .from("championship_standings")
      .select(
        `
          id,
          season,
          series,
          class_name,
          position,
          rider_name,
          race_number,
          manufacturer,
          points,
          source_url,
          updated_at
        `
      )
      .eq("season", latestStandingData.season)
      .eq("series", latestStandingData.series)
      .eq("class_name", latestStandingData.class_name)
      .order("position", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    standings = (data ?? []) as Standing[];
  }

  const defaultUrl =
    latestStandingData?.source_url ??
    "https://racerxonline.com/mx/2026/points/450";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-10 sm:py-14">
          <Link
            href="/admin"
            className="text-sm font-bold text-zinc-500 transition hover:text-orange-500"
          >
            ← Back to Race Control
          </Link>

          <div className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
              Race Control
            </p>

            <h1 className="mt-4 text-4xl font-black uppercase tracking-tight sm:text-6xl">
              Championship Standings
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
              Import the official 450 championship standings after each
              race. The previous standings for the same season and
              series will be replaced automatically.
            </p>
          </div>

          {params.success === "true" && (
            <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4">
              <p className="font-black text-green-400">
                Championship standings imported successfully.
              </p>

              <p className="mt-1 text-sm text-green-300/70">
                {params.count ?? "0"} riders imported for{" "}
                {params.season ?? ""} {params.series ?? ""}.
              </p>
            </div>
          )}

          {params.error && (
            <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
              <p className="font-black text-red-400">
                Standings import failed
              </p>

              <p className="mt-1 text-sm leading-6 text-red-300/80">
                {params.error}
              </p>
            </div>
          )}

          <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Standings Source
                </p>

                <h2 className="mt-3 text-2xl font-black uppercase">
                  Import Racer X 450 Standings
                </h2>
              </div>

              <span className="w-fit rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-black uppercase text-zinc-400">
                450 Class
              </span>
            </div>

            <form
              action={importChampionshipStandings}
              className="mt-7"
            >
              <label
                htmlFor="source_url"
                className="text-xs font-black uppercase tracking-widest text-zinc-500"
              >
                Racer X Standings URL
              </label>

              <input
                id="source_url"
                name="source_url"
                type="url"
                required
                defaultValue={defaultUrl}
                placeholder="https://racerxonline.com/mx/2026/points/450"
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
              />

              <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="text-sm font-bold text-zinc-300">
                  Accepted URL examples
                </p>

                <div className="mt-3 space-y-2 break-all text-xs leading-5 text-zinc-500">
                  <p>
                    https://racerxonline.com/mx/2026/points/450
                  </p>

                  <p>
                    https://racerxonline.com/sx/2027/points/450
                  </p>

                  <p>
                    https://racerxonline.com/smx/2027/points/450
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="mt-6 w-full rounded-full bg-orange-500 px-7 py-4 font-black uppercase text-black transition hover:bg-orange-400"
              >
                Import 450 Standings
              </button>
            </form>
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
            <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 p-6 sm:flex-row sm:items-end sm:p-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Current Imported Data
                </p>

                <h2 className="mt-3 text-2xl font-black uppercase">
                  {latestStandingData
                    ? `${latestStandingData.season} ${latestStandingData.series} 450`
                    : "No Standings Imported"}
                </h2>
              </div>

              {latestStandingData && (
                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                    Last Updated
                  </p>

                  <p className="mt-1 text-sm font-bold text-zinc-400">
                    {formatDateTime(
                      latestStandingData.updated_at
                    )}
                  </p>
                </div>
              )}
            </div>

            {standings.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-xl font-black">
                  No championship standings yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Paste a Racer X 450 standings link above and run the
                  first import.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[90px_1fr_120px] border-b border-zinc-800 bg-zinc-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 sm:grid">
                  <div>Position</div>
                  <div>Rider</div>
                  <div className="text-right">Points</div>
                </div>

                <div className="divide-y divide-zinc-800">
                  {standings.map((standing) => (
                    <div
                      key={standing.id}
                      className="grid grid-cols-[54px_1fr_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[90px_1fr_120px] sm:px-6"
                    >
                      <div>
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${
                            standing.position === 1
                              ? "bg-orange-500 text-black"
                              : "bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          {standing.position}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-black">
                          {standing.rider_name}
                        </p>

                        {(standing.manufacturer ||
                          standing.race_number) && (
                          <p className="mt-1 truncate text-xs text-zinc-600">
                            {standing.race_number
                              ? `#${standing.race_number}`
                              : ""}

                            {standing.race_number &&
                            standing.manufacturer
                              ? " • "
                              : ""}

                            {standing.manufacturer ?? ""}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black">
                          {standing.points}
                        </span>

                        <span className="ml-1 text-xs font-bold uppercase text-zinc-600">
                          pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}