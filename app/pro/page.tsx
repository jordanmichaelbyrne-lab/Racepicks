import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import EnterProButton from "./EnterProButton";
import { enterPro } from "./enterActions";
import { PRO_FREE_FOR_SEASON, PRO_SEASON } from "@/app/pro/lib/proConfig";

const proFeatures = [
  {
    title: "5 Rider Team",
    description:
      "Build a five-rider fantasy team using either 3 Factory + 2 Challenger or 2 Factory + 3 Challenger.",
  },
  {
    title: "$31M Salary Cap",
    description:
      "Every rider has a value. Build smart, find value and manage your budget across the full season.",
  },
  {
    title: "Dynamic Rider Values",
    description:
      "Rider salaries can rise or fall on Mondays based on recent performance and form.",
  },
  {
    title: "Limited Transfers",
    description:
      "3 Factory transfers, 5 Challenger transfers, plus free injury replacements when eligible.",
  },
  {
    title: "Manufacturer Pick",
    description:
      "Choose one bike manufacturer for the whole season and earn small performance bonuses.",
  },
  {
    title: "Full SMX Season",
    description:
      "Supercross, Triple Crowns, Pro Motocross and all three SMX Playoff rounds count toward one championship.",
  },
];

const scoringFeatures = [
  "Race finishing points",
  "Challenger performance bonuses",
  "+10 for every holeshot",
  "Triple Crown race scoring",
  "Moto + overall scoring in Pro Motocross",
  "SMX Playoff multipliers",
  "SX, MX and SMX championship bonuses",
  "Small manufacturer bonus system",
];

export default async function ProLandingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasAccess = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pro_access")
      .eq("id", user.id)
      .maybeSingle();

    hasAccess = Boolean(profile?.pro_access);

    // Already entered and set up: the Pro link goes straight to the game.
    const { data: team } = await supabase
      .from("pro_teams")
      .select("id")
      .eq("user_id", user.id)
      .eq("season", PRO_SEASON)
      .maybeSingle();

    if (team) {
      redirect("/pro/team");
    }
  }

  const { count: teamCount } = await supabase
    .from("pro_teams")
    .select("id", { count: "exact", head: true })
    .eq("season", PRO_SEASON);

  function EntryButton() {
    if (!user) {
      return (
        <>
          <Link
            href="/signup"
            className="w-full rounded-full bg-orange-500 px-8 py-4 text-center text-lg font-black uppercase text-black transition hover:bg-orange-400 sm:w-auto"
          >
            Sign up to enter
          </Link>
          <Link
            href="/login"
            className="text-sm font-bold text-zinc-400 transition hover:text-white"
          >
            Already have an account? Log in
          </Link>
        </>
      );
    }

    if (hasAccess) {
      return (
        <Link
          href="/pro/team"
          className="w-full rounded-full bg-orange-500 px-8 py-4 text-center text-lg font-black uppercase text-black transition hover:bg-orange-400 sm:w-auto"
        >
          Build your team →
        </Link>
      );
    }

    return (
      <form action={enterPro} className="w-full sm:w-auto">
        <EnterProButton label="Enter MX Gatepicks Pro" />
      </form>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Navbar />

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-orange-500/20 bg-zinc-950 px-6 py-14 text-center sm:px-10 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_40%)]" />

          <div className="relative">
            {PRO_FREE_FOR_SEASON && (
              <span className="inline-flex rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-green-400">
                Free to play in {PRO_SEASON}
              </span>
            )}

            <p className="mt-8 text-sm font-black uppercase tracking-[0.35em] text-orange-500">
              MX Gatepicks Pro
            </p>

            <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-7xl lg:text-8xl">
              Team Manager
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-400 sm:text-xl">
              Build your own five-rider race team. Manage the salary cap. Make
              strategic transfers. Compete across the entire SuperMotocross
              season.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3">
              <EntryButton />

              {typeof teamCount === "number" && teamCount > 0 && (
                <p className="text-xs text-neutral-500">
                  {teamCount} {teamCount === 1 ? "team" : "teams"} entered so
                  far
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {proFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
                Pro Feature
              </p>
              <h2 className="mt-3 text-2xl font-black uppercase">
                {feature.title}
              </h2>
              <p className="mt-3 leading-7 text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Scoring
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
            Every Round Matters
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            The Pro championship runs from the opening Supercross round
            through Pro Motocross and all the way to the final SMX Playoff.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scoringFeatures.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-zinc-800 bg-black px-4 py-4 font-bold"
              >
                <span className="mr-2 text-orange-500">+</span>
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                SMX Playoff 1
              </p>
              <p className="mt-2 text-3xl font-black">×1</p>
            </div>
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                SMX Playoff 2
              </p>
              <p className="mt-2 text-3xl font-black">×1.5</p>
            </div>
            <div className="rounded-2xl border border-orange-500 bg-orange-500 p-5 text-black">
              <p className="text-xs font-black uppercase tracking-widest">
                SMX Final
              </p>
              <p className="mt-2 text-3xl font-black">×2</p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-orange-500/30 bg-orange-500/10 p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Important
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase">
            You Still Play MX Gatepicks.
          </h2>
          <p className="mt-4 max-w-4xl leading-7 text-zinc-300">
            MX Gatepicks Pro does not replace the normal Championship. Pro
            players still make their regular 1st, 2nd, 3rd and Wildcard picks
            and compete on the main MX Gatepicks leaderboard.
          </p>
          <p className="mt-3 max-w-4xl leading-7 text-zinc-400">
            Team Manager is a second competition running alongside it, with
            deeper strategy and its own leaderboard.
          </p>
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 text-center sm:p-9">
          <h2 className="text-2xl font-black uppercase sm:text-3xl">
            Ready to build your team?
          </h2>

          <div className="mt-6 flex flex-col items-center gap-3">
            <EntryButton />
            <Link
              href="/pro/how-to-play"
              className="text-sm font-black text-orange-500 transition hover:text-orange-400"
            >
              Read the full rules →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}