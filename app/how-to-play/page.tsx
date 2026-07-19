import Link from "next/link";
import Navbar from "../components/Navbar";
import HowToPlayContent from "../components/HowToPlayContent";

export default function HowToPlayPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto max-w-3xl py-14">
          <Link
            href="/workshop"
            className="text-sm font-bold text-zinc-500 transition hover:text-orange-500"
          >
            ← Back to Workshop
          </Link>

          <p className="mt-8 text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Racepicks
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">
            How to Play
          </h1>

          <div className="mt-10">
            <HowToPlayContent />
          </div>
        </section>
      </div>
    </main>
  );
}