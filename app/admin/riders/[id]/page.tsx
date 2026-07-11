import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { updateRider } from "../actions";

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

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRiderPage({ params }: PageProps) {
  const { id } = await params;
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
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const rider = data as Rider;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/riders"
          className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to Rider Manager
        </Link>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Race Control
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase sm:text-6xl">
            Edit Rider
          </h1>

          <p className="mt-3 text-sm text-neutral-400">
            Update {rider.full_name}&apos;s rider details.
          </p>
        </header>

        <section className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
          <form action={updateRider} className="space-y-6">
            <input type="hidden" name="rider_id" value={rider.id} />

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
                defaultValue={rider.full_name}
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="race_number"
                  className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
                >
                  Race Number
                </label>

                <input
                  id="race_number"
                  name="race_number"
                  type="number"
                  min="0"
                  defaultValue={rider.race_number ?? ""}
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
                  defaultValue={rider.class_name}
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
                defaultValue={rider.team_name ?? ""}
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
                defaultValue={rider.manufacturer ?? ""}
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
                defaultValue={rider.nationality ?? ""}
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
                defaultValue={rider.racerx_slug ?? ""}
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
                defaultValue={rider.image_url ?? ""}
                placeholder="https://..."
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-800 pt-6 sm:flex-row">
              <button
                type="submit"
                className="rounded-xl bg-orange-500 px-6 py-3 font-black uppercase text-black transition hover:bg-orange-400"
              >
                Save Changes
              </button>

              <Link
                href="/admin/riders"
                className="rounded-xl border border-neutral-700 px-6 py-3 text-center font-bold transition hover:border-neutral-500"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}