import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/server";
import BanterTabs from "./BanterTabs";

export default async function BanterPage() {
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
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="mx-auto max-w-4xl py-10 sm:py-14">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Racepicks Community
          </p>

          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-7xl">
            Banter
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Talk racing, share links, argue about picks and enjoy the
            weekend. Keep it friendly enough that everyone can stay on
            the gate.
          </p>

          <BanterTabs currentUserId={user.id} isAdmin={isAdmin} />
        </section>
      </div>
    </main>
  );
}