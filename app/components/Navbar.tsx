"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function Navbar() {
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
            <>
              <div className="h-10 w-10 rounded-full border border-zinc-700" />
              <div className="hidden h-10 w-10 rounded-full border border-zinc-700 sm:block" />
            </>
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

              <Link
                href="/workshop"
                aria-label="Open Workshop"
                title="Workshop"
                className={`hidden h-10 w-10 items-center justify-center rounded-full border transition sm:flex ${
                  pathname.startsWith("/workshop")
                    ? "border-orange-500 bg-orange-500 text-black"
                    : "border-zinc-700 text-white hover:border-orange-500 hover:bg-zinc-900"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="h-5 w-5"
                >
                  <path
                    d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <path
                    d="M19.1 13.5a7.75 7.75 0 0 0 0-3l2-1.55-2-3.46-2.48 1a7.7 7.7 0 0 0-2.6-1.5L13.65 2h-4l-.37 2.99a7.7 7.7 0 0 0-2.6 1.5l-2.48-1-2 3.46 2 1.55a7.75 7.75 0 0 0 0 3l-2 1.55 2 3.46 2.48-1a7.7 7.7 0 0 0 2.6 1.5L9.65 22h4l.37-2.99a7.7 7.7 0 0 0 2.6-1.5l2.48 1 2-3.46-2-1.55Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
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
                  className={`flex items-center gap-3 px-5 py-4 font-black transition ${
                    pathname.startsWith("/account")
                      ? "bg-orange-500/10 text-orange-400"
                      : "text-white hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-black">
                    {initials}
                  </div>

                  <div>
                    <p>Player Dashboard</p>
                    <p className="mt-0.5 text-xs font-medium text-zinc-500">
                      {displayName}
                    </p>
                  </div>
                </Link>

                <Link
                  href="/workshop"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-5 py-4 font-black transition ${
                    pathname.startsWith("/workshop")
                      ? "bg-orange-500/10 text-orange-400"
                      : "text-white hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        className="h-4 w-4"
                      >
                        <path
                          d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />

                        <path
                          d="M19.1 13.5a7.75 7.75 0 0 0 0-3l2-1.55-2-3.46-2.48 1a7.7 7.7 0 0 0-2.6-1.5L13.65 2h-4l-.37 2.99a7.7 7.7 0 0 0-2.6 1.5l-2.48-1-2 3.46 2 1.55a7.75 7.75 0 0 0 0 3l-2 1.55 2 3.46 2.48-1a7.7 7.7 0 0 0 2.6 1.5L9.65 22h4l.37-2.99a7.7 7.7 0 0 0 2.6-1.5l2.48 1 2-3.46-2-1.55Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <span>Workshop</span>
                  </div>

                  <span className="text-zinc-600">→</span>
                </Link>
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