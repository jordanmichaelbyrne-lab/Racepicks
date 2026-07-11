import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Player";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto max-w-3xl py-16">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Player Account
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
            {displayName}
          </h1>

          <p className="mt-4 text-lg text-zinc-400">{user.email}</p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                Account Status
              </p>

              <p className="mt-3 text-2xl font-black text-green-400">
                Active
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7">
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                Role
              </p>

              <p className="mt-3 text-2xl font-black">Player</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
            <h2 className="text-3xl font-black">My Competitions</h2>

            <p className="mt-4 text-zinc-400">
              Competition entries, rankings and pick history will appear here
              once the database tables are connected.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}