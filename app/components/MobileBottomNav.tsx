"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/",
      label: "Race",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M9.5 20v-6h5v6" />
        </svg>
      ),
    },
    {
      href: "/picks",
      label: "Picks",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M9 5h11" />
          <path d="M9 12h11" />
          <path d="M9 19h11" />
          <path d="m3 5 1.5 1.5L7 4" />
          <path d="m3 12 1.5 1.5L7 11" />
          <path d="m3 19 1.5 1.5L7 18" />
        </svg>
      ),
    },
    {
      href: "/leaderboard",
      label: "Championship",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
          <path d="M7 6H4v1a4 4 0 0 0 4 4" />
          <path d="M17 6h3v1a4 4 0 0 1-4 4" />
        </svg>
      ),
    },
    {
      href: "/results",
      label: "Results",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M6 3h12v18H6z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      ),
    },
    {
      href: "/account",
      label: "Account",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      ),
    },
  ];

  const hiddenRoute =
  pathname.startsWith("/login") ||
  pathname.startsWith("/signup");

  if (hiddenRoute) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-black/95 px-2 pt-2 backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${
                isActive
                  ? "bg-orange-500/15 text-orange-500"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  isActive ? "text-orange-500" : ""
                }`}
              >
                {item.icon}
              </span>

              <span className="w-full truncate text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}