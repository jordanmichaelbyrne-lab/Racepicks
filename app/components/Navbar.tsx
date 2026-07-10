import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between gap-6 py-2">
      <Link
        href="/"
        className="text-3xl font-black tracking-tight text-white"
      >
        Racepicks
      </Link>

      <div className="hidden items-center gap-8 text-sm font-semibold text-zinc-400 md:flex">
        <Link href="/" className="transition hover:text-white">
          Next Race
        </Link>

        <Link href="/leaderboard" className="transition hover:text-white">
          Leaderboard
        </Link>

        <Link href="/results" className="transition hover:text-white">
          Results
        </Link>

        <Link href="/news" className="transition hover:text-white">
          News
        </Link>
      </div>

      <Link
        href="/signin"
        className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-zinc-900"
      >
        Sign In
      </Link>
    </nav>
  );
}