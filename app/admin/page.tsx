import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import { races } from "../data/races";
import { competitions } from "../data/competitions";
import { createClient } from "../lib/supabase/server";

export default async function AdminPage() {
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

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const now = Date.now();

  const upcomingRaces = races
    .filter((race) => new Date(race.pickLock).getTime() > now)
    .sort(
      (firstRace, secondRace) =>
        new Date(firstRace.pickLock).getTime() -
        new Date(secondRace.pickLock).getTime()
    );

  const nextRace = upcomingRaces[0] ?? races[races.length - 1];

  const activeCompetition = competitions.find(
    (competition) => competition.id === nextRace.competitionId
  );

  const dashboardActions = [
    {
      title: "Entry List",
      description:
        "Import, review and publish the confirmed 450 rider entry list.",
      status: "Not Imported",
      href: "/admin/results",
    },
    {
      title: "Wildcard",
      description:
        "Review or change the wildcard finishing position for this round.",
      status: `${nextRace.wildcardPosition}th Place`,
      href: "/admin/wildcard",
    },
    {
      title: "Picks Control",
      description:
        "Open entries, close picks and review the number of submitted players.",
      status: "Upcoming",
      href: "/admin/picks",
    },
    {
      title: "Race Results",
      description:
        "Import official results and confirm the finishing order.",
      status: "Not Imported",
      href: "/admin/results",
    },
    {
      title: "Scoring",
      description:
        "Calculate round scores and publish the updated leaderboard.",
      status: "Pending",
      href: "/admin/scoring",
    },
    {
      title: "Players",
      description:
        "Review registered users, roles and competition participation.",
      status: "Manage",
      href: "/admin/players",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="py-14">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
                Race Control
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
                Admin Dashboard
              </h1>

              <p className="mt-4 text-lg text-zinc-400">
                Welcome, {profile.display_name ?? "Administrator"}.
              </p>
            </div>

            <span className="w-fit rounded-full border border-orange-500/40 bg-orange-500/10 px-5 py-2 text-sm font-black uppercase tracking-wider text-orange-400">
              Administrator
            </span>
          </div>

          <div className="mt-12 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
            <div
              className="relative bg-cover bg-center p-8 md:p-10"
              style={{
                backgroundImage: `url(${nextRace.image})`,
              }}
            >
              <div className="absolute inset-0 bg-black/75" />

              <div className="relative">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-500">
                  Current Event
                </p>

                <h2 className="mt-3 text-4xl font-black md:text-6xl">
                  {nextRace.name}
                </h2>

                <p className="mt-3 text-lg text-zinc-300">
                  {activeCompetition?.shortName} • Round {nextRace.round}
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-black/50 p-5 backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Race Date
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {nextRace.raceDate}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5 backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                      Wildcard
                    </p>

                    <p className="mt-2 text-3xl font-black">
                      {nextRace.wildcardPosition}th
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-black/50 p-5 backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Picks Close
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {nextRace.pickLockDisplay}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {dashboardActions.map((action) => (
              <div
                key={action.title}
                className="flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-black">{action.title}</h2>

                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-400">
                    {action.status}
                  </span>
                </div>

                <p className="mt-4 flex-1 leading-7 text-zinc-400">
                  {action.description}
                </p>

                <Link
                  href={action.href}
                  className="mt-7 rounded-full border border-zinc-700 px-5 py-3 text-center font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6">
            <p className="font-bold text-yellow-300">
              The dashboard buttons are visual placeholders for now. We’ll
              connect each control to Supabase one feature at a time.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}