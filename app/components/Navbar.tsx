"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);
      setIsLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();

    setUser(null);
    router.push("/");
    router.refresh();
  }

  const displayName: string =
    typeof user?.user_metadata?.display_name === "string" &&
    user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name
      : user?.email?.split("@")[0] || "Account";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((name: string) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="flex w-full items-center justify-between gap-3 py-2">
      <Link
        href="/"
        className="shrink-0 text-2xl font-black tracking-tight text-white sm:text-3xl"
      >
        Racepicks
      </Link>

      <div className="hidden items-center gap-8 text-sm font-semibold text-zinc-400 md:flex">
        <Link href="/" className="transition hover:text-white">
          Next Race
        </Link>

        <Link
          href="/leaderboard"
          className="transition hover:text-white"
        >
          Leaderboard
        </Link>

        <Link href="/results" className="transition hover:text-white">
          Results
        </Link>

        <Link href="/news" className="transition hover:text-white">
          News
        </Link>
      </div>

      {isLoading ? (
        <div className="h-10 w-10 shrink-0 rounded-full border border-zinc-800" />
      ) : user ? (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/account"
            aria-label="Open player dashboard"
            title="Player dashboard"
            className="flex shrink-0 items-center gap-3 rounded-full transition hover:opacity-80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-500 bg-orange-500/10 text-sm font-black text-orange-400">
              {initials}
            </div>

            <span className="hidden text-sm font-bold text-zinc-300 lg:block">
              {displayName}
            </span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="shrink-0 rounded-full border border-zinc-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-zinc-900 sm:px-5 sm:text-sm"
          >
            <span className="sm:hidden">Out</span>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/signup"
            className="hidden text-sm font-bold text-zinc-300 transition hover:text-white sm:block"
          >
            Sign Up
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-900 sm:px-5"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}