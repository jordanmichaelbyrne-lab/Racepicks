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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();

    setUser(null);
    setIsMobileMenuOpen(false);

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
    { href: "/banter", label: "Banter" },
    { href: "/news", label: "News" },
  ];

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <nav className="relative py-3">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="shrink-0 text-2xl font-black tracking-tight text-white transition hover:text-orange-500 sm:text-3xl"
        >
          Racepicks
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-bold transition ${
                isActive(item.href)
                  ? "text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isLoading ? (
            <div className="h-10 w-10 rounded-full border border-zinc-700" />
          ) : user ? (
            <>
              <Link
                href="/account"
                aria-label="Open player dashboard"
                className="flex items-center gap-3 transition hover:opacity-80"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-black">
                  {initials}
                </div>

                <span className="hidden font-bold text-white lg:block">
                  {displayName}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="hidden rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold transition hover:border-orange-500 hover:bg-zinc-900 sm:block"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="hidden text-sm font-bold text-zinc-400 transition hover:text-white sm:block"
              >
                Sign Up
              </Link>

              <Link
                href="/login"
                className="hidden rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold transition hover:border-orange-500 hover:bg-zinc-900 sm:block"
              >
                Sign In
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() =>
              setIsMobileMenuOpen((currentValue) => !currentValue)
            }
            aria-label={
              isMobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={isMobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-white transition hover:border-orange-500 hover:bg-zinc-900 md:hidden"
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition ${
                  isMobileMenuOpen
                    ? "translate-y-[7px] rotate-45"
                    : ""
                }`}
              />

              <span
                className={`absolute left-0 top-[7px] h-0.5 w-5 bg-current transition ${
                  isMobileMenuOpen ? "opacity-0" : ""
                }`}
              />

              <span
                className={`absolute bottom-0 left-0 h-0.5 w-5 bg-current transition ${
                  isMobileMenuOpen
                    ? "-translate-y-[7px] -rotate-45"
                    : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl md:hidden">
          <div className="divide-y divide-zinc-800">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-5 py-4 text-base font-black transition ${
                  isActive(item.href)
                    ? "bg-orange-500/10 text-orange-400"
                    : "text-white hover:bg-zinc-900"
                }`}
              >
                <span>{item.label}</span>

                <span className="text-zinc-600">→</span>
              </Link>
            ))}

            {user ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-4 font-black text-white transition hover:bg-zinc-900"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-black">
                    {initials}
                  </div>

                  <span>My Dashboard</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full px-5 py-4 text-left font-black text-red-400 transition hover:bg-red-500/10"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4">
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-black text-white transition hover:border-orange-500"
                >
                  Sign Up
                </Link>

                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full bg-orange-500 px-4 py-3 text-center text-sm font-black text-black transition hover:bg-orange-400"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}