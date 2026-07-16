import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { updatePlayerRole } from "./actions";

type AdminPlayerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  competition_count: number;
  submitted_rounds: number;
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    updated?: string;
    selfRoleBlocked?: string;
  }>;
};

function formatDate(date: string | null) {
  if (!date) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

export default async function AdminPlayersPage({
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

  const { data: currentProfile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (currentProfile?.role !== "admin") {
    redirect("/");
  }

  const { data, error } = await supabase.rpc(
    "get_admin_players"
  );

  if (error) {
    throw new Error(error.message);
  }

  const players = (data ?? []) as AdminPlayerRow[];

  const searchQuery = (params.q ?? "")
    .trim()
    .toLowerCase();

  const selectedRole =
    params.role === "admin" || params.role === "player"
      ? params.role
      : "all";

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      !searchQuery ||
      player.display_name
        ?.toLowerCase()
        .includes(searchQuery) ||
      player.email
        ?.toLowerCase()
        .includes(searchQuery);

    const matchesRole =
      selectedRole === "all" ||
      player.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  const adminCount = players.filter(
    (player) => player.role === "admin"
  ).length;

  const playerCount = players.filter(
    (player) => player.role !== "admin"
  ).length;

  const submittedPlayerCount = players.filter(
    (player) => Number(player.submitted_rounds) > 0
  ).length;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="text-sm font-bold text-zinc-400 transition hover:text-orange-500"
        >
          ← Back to Race Control
        </Link>

        <header className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Race Control
          </p>

          <h1 className="mt-3 text-5xl font-black uppercase sm:text-7xl">
            Players
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
            Review registered users, competition activity and
            administrator access.
          </p>
        </header>

        {params.updated === "true" && (
          <div className="mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 font-bold text-green-300">
            Player role updated successfully.
          </div>
        )}

        {params.selfRoleBlocked === "true" && (
          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 font-bold text-yellow-300">
            You cannot remove your own administrator access.
          </div>
        )}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Registered Accounts
            </p>

            <p className="mt-3 text-4xl font-black">
              {players.length}
            </p>
          </div>

          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400">
              Active Players
            </p>

            <p className="mt-3 text-4xl font-black">
              {playerCount}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
              Administrators
            </p>

            <p className="mt-3 text-4xl font-black">
              {adminCount}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Submitted Picks
            </p>

            <p className="mt-3 text-4xl font-black">
              {submittedPlayerCount}
            </p>
          </div>
        </section>

        <form
          method="get"
          className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <div>
              <label
                htmlFor="q"
                className="text-xs font-bold uppercase tracking-widest text-zinc-500"
              >
                Search Players
              </label>

              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params.q ?? ""}
                placeholder="Name or email"
                className="mt-3 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 font-semibold text-white outline-none transition focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="text-xs font-bold uppercase tracking-widest text-zinc-500"
              >
                Role
              </label>

              <select
                id="role"
                name="role"
                defaultValue={selectedRole}
                className="mt-3 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 font-semibold text-white"
              >
                <option value="all">All Roles</option>
                <option value="player">Players</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            <button
              type="submit"
              className="self-end rounded-xl border border-orange-500 px-6 py-3 font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
            >
              Apply Filters
            </button>
          </div>
        </form>

        <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 px-6 py-5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
              Player Directory
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {filteredPlayers.length}{" "}
              {filteredPlayers.length === 1
                ? "Account"
                : "Accounts"}
            </h2>
          </div>

          {filteredPlayers.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {filteredPlayers.map((player) => {
                const isCurrentUser = player.id === user.id;
                const isAdmin = player.role === "admin";

                return (
                  <article
                    key={player.id}
                    className="p-6 transition hover:bg-zinc-900/50"
                  >
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-black ${
                            isAdmin
                              ? "bg-orange-500 text-black"
                              : "bg-zinc-800 text-white"
                          }`}
                        >
                          {(player.display_name ??
                            player.email ??
                            "P")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="truncate text-xl font-black">
                              {player.display_name ??
                                "Unnamed Player"}
                            </h3>

                            {isCurrentUser && (
                              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black uppercase text-blue-400">
                                You
                              </span>
                            )}

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                                isAdmin
                                  ? "bg-orange-500/10 text-orange-400"
                                  : "bg-green-500/10 text-green-400"
                              }`}
                            >
                              {isAdmin ? "Admin" : "Player"}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-zinc-400">
                            {player.email ??
                              "No email available"}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            <span>
                              Joined {formatDate(player.created_at)}
                            </span>

                            <span>
                              Last active{" "}
                              {formatDate(player.last_sign_in_at)}
                            </span>

                            <span>
                              {Number(player.competition_count)}{" "}
                              competitions
                            </span>

                            <span>
                              {Number(player.submitted_rounds)}{" "}
                              submitted rounds
                            </span>
                          </div>
                        </div>
                      </div>

                      <form
                        action={updatePlayerRole}
                        className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center"
                      >
                        <input
                          type="hidden"
                          name="player_id"
                          value={player.id}
                        />

                        <select
                          name="role"
                          defaultValue={
                            isAdmin ? "admin" : "player"
                          }
                          disabled={isCurrentUser}
                          className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="player">Player</option>
                          <option value="admin">Administrator</option>
                        </select>

                        <button
                          type="submit"
                          disabled={isCurrentUser}
                          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Save Role
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <h3 className="text-2xl font-black">
                No players found
              </h3>

              <p className="mt-3 text-zinc-400">
                Try changing the search or role filter.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}