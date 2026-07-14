"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
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

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const displayName =
    typeof user?.user_metadata?.display_name === "string" &&
    user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name
      : user?.email?.split("@")[0] || "Account";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navItems = [
  { href: "/", label: "Next Race" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/results", label: "Race Results" },
  { href: "/news", label: "News" },
];

  return (
    <nav className="flex items-center justify-between py-3">

      <Link
        href="/"
        className="text-3xl font-black tracking-tight text-white transition hover:text-orange-500"
      >
        Racepicks
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-bold transition ${
                active
                  ? "text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {isLoading ? (
        <div className="h-10 w-10 rounded-full border border-zinc-700" />
      ) : user ? (
        <div className="flex items-center gap-3">

          <Link
            href="/account"
            className="flex items-center gap-3 transition hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 font-black text-black">
              {initials}
            </div>

            <span className="hidden font-bold text-white lg:block">
              {displayName}
            </span>
          </Link>

          <button
            onClick={handleSignOut}
            className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold transition hover:border-orange-500 hover:bg-zinc-900"
          >
            Sign Out
          </button>

        </div>
      ) : (
        <div className="flex items-center gap-4">

          <Link
            href="/signup"
            className="text-sm font-bold text-zinc-400 transition hover:text-white"
          >
            Sign Up
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold transition hover:border-orange-500 hover:bg-zinc-900"
          >
            Sign In
          </Link>

        </div>
      )}
    </nav>
  );
}