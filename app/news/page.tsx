import Link from "next/link";
import Navbar from "../components/Navbar";

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center py-16 text-center">
          <div>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-500/40 bg-orange-500/10 text-4xl">
              🏁
            </div>

            <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-orange-500">
              Racepicks News
            </p>

            <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-7xl">
              Under Construction
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-zinc-400">
              We’re still deciding what belongs here. Race updates,
              championship stories and rider news may be added later.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="rounded-full bg-orange-500 px-7 py-3 font-black text-black transition hover:bg-orange-400"
              >
                Back to Race Centre
              </Link>

              <Link
                href="/leaderboard"
                className="rounded-full border border-zinc-700 px-7 py-3 font-black text-white transition hover:border-orange-500"
              >
                View Championship
              </Link>
            </div>

            <p className="mt-10 text-sm text-zinc-600">
              News is parked for now while we focus on picks, scoring and
              the championship.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}