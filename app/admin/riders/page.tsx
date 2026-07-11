import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { addRider, toggleRiderStatus } from "./actions";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
  nationality: string | null;
  class_name: string;
  racerx_slug: string | null;
  image_url: string | null;
  is_active: boolean;
};

export default async function AdminRidersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("riders")
    .select(
      `
        id,
        full_name,
        race_number,
        team_name,
        manufacturer,
        nationality,
        class_name,
        racerx_slug,
        image_url,
        is_active
      `
    )
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Rider loading error:", error);
  }

  const riders = (data ?? []) as Rider[];
  const activeRiders = riders.filter((rider) => rider.is_active).length;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to admin dashboard
        </Link>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Race Control
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase sm:text-6xl">
            Rider Manager
          </h1>

          <p className="mt-3 text-sm text-neutral-400">
            Add riders and control who is available for RacePicks.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Total Riders
            </p>
            <p className="mt-2 text-2xl font-black">{riders.length}</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Active Riders
            </p>
            <p className="mt-2 text-2xl font-black text-orange-500">
              {activeRiders}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Disabled Riders
            </p>
            <p className="mt-2 text-2xl font-black">
              {riders.length - activeRiders}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
          <section className="h-fit rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <h2 className="text-xl font-black uppercase">Add Rider</h2>

            <form action={addRider} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="full_name"
                  className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                >
                  Rider Name
                </label>

                <input
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="Jett Lawrence"
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="race_number"
                    className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                  >
                    Number
                  </label>

                  <input
                    id="race_number"
                    name="race_number"
                    type="number"
                    min="0"
                    placeholder="18"
                    className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="class_name"
                    className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                  >
                    Class
                  </label>

                  <select
                    id="class_name"
                    name="class_name"
                    defaultValue="450"
                    className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                  >
                    <option value="450">450</option>
                    <option value="250">250</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="team_name"
                  className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                >
                  Team
                </label>

                <input
                  id="team_name"
                  name="team_name"
                  placeholder="Honda HRC Progressive"
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                />
              </div>

              <div>
                <label
                  htmlFor="manufacturer"
                  className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                >
                  Manufacturer
                </label>

                <select
                  id="manufacturer"
                  name="manufacturer"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                >
                  <option value="">Select manufacturer</option>
<option value="Honda">Honda</option>
<option value="Yamaha">Yamaha</option>
<option value="Kawasaki">Kawasaki</option>
<option value="KTM">KTM</option>
<option value="Husqvarna">Husqvarna</option>
<option value="GasGas">GasGas</option>
<option value="Suzuki">Suzuki</option>
<option value="Triumph">Triumph</option>
<option value="Ducati">Ducati</option>
<option value="Beta">Beta</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="nationality"
                  className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                >
                  Nationality
                </label>

                <input
                  id="nationality"
                  name="nationality"
                  placeholder="Australia"
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                />
              </div>

              <div>
                <label
                  htmlFor="racerx_slug"
                  className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                >
                  Racer X Slug
                </label>

                <input
                  id="racerx_slug"
                  name="racerx_slug"
                  placeholder="jett-lawrence"
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                />
              </div>

              <div>
                <label
                  htmlFor="image_url"
                  className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                >
                  Image URL
                </label>

                <input
                  id="image_url"
                  name="image_url"
                  type="url"
                  placeholder="https://..."
                  className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-orange-500 px-5 py-3 font-black uppercase text-black transition hover:bg-orange-400"
              >
                Save Rider
              </button>
            </form>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-2xl font-black uppercase">Current Riders</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Riders currently stored in Supabase.
              </p>
            </div>

            {riders.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-10 text-center">
                <h3 className="text-xl font-bold">No riders added yet</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Add the first rider using the form.
                </p>
              </div>) : (
  <div className="space-y-3">
    {riders.map((rider) => (
      <article
        key={rider.id}
        className={`flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
          rider.is_active
            ? "border-neutral-800 bg-neutral-950"
            : "border-neutral-900 bg-neutral-950/50 opacity-60"
        }`}
      >
        <div className="flex items-center gap-4">
          {rider.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rider.image_url}
              alt={rider.full_name}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 min-w-16 items-center justify-center rounded-xl bg-orange-500 px-3 text-xl font-black text-black">
              #{rider.race_number ?? "—"}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">{rider.full_name}</h3>

              <span className="rounded-full bg-neutral-800 px-2 py-1 text-[10px] font-bold uppercase text-neutral-400">
                {rider.class_name}
              </span>
            </div>

            <p className="mt-1 text-sm text-neutral-400">
              {rider.manufacturer || "Unknown manufacturer"}
              {rider.team_name ? ` · ${rider.team_name}` : ""}
            </p>

            {rider.nationality && (
              <p className="mt-1 text-xs text-neutral-600">
                {rider.nationality}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              rider.is_active
                ? "bg-green-950 text-green-400"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {rider.is_active ? "Active" : "Disabled"}
          </span>

          <Link
            href={`/admin/riders/${rider.id}`}
            className="rounded-xl border border-orange-500 px-4 py-2 text-sm font-bold text-orange-500 transition hover:bg-orange-500 hover:text-black"
          >
            Edit
          </Link>

          <form action={toggleRiderStatus}>
            <input type="hidden" name="rider_id" value={rider.id} />

            <input
              type="hidden"
              name="current_status"
              value={String(rider.is_active)}
            />

            <button
              type="submit"
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-bold transition hover:border-orange-500 hover:text-orange-500"
            >
              {rider.is_active ? "Disable" : "Enable"}
            </button>
          </form>
        </div>
      </article>
    ))}
  </div>
)}
          </section>
        </div>
      </div>
    </main>
  );
}