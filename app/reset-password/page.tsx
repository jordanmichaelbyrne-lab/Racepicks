"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/client";

type Status = "checking" | "ready" | "invalid" | "done";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The reset link signs the player in to a temporary "recovery" session.
    // The Supabase browser client picks that up from the link automatically,
    // so here we simply wait for a session to appear.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        (event === "SIGNED_IN" && session)
      ) {
        setStatus((current) => (current === "done" ? current : "ready"));
      }
    });

    async function waitForSession() {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );

      // Expired or already-used links come back with an error in the URL.
      if (
        queryParams.get("error") ||
        queryParams.get("error_code") ||
        hashParams.get("error") ||
        hashParams.get("error_code")
      ) {
        if (!cancelled) setStatus("invalid");
        return;
      }

      for (let attempt = 0; attempt < 8; attempt++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session) {
          setStatus((current) => (current === "done" ? current : "ready"));
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!cancelled) {
        setStatus((current) => (current === "checking" ? "invalid" : current));
      }
    }

    waitForSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `Your password needs to be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The two passwords don't match.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setStatus("done");

    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto max-w-lg py-16">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Account Help
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            New Password
          </h1>

          {status === "checking" && (
            <p className="mt-6 text-zinc-400">Checking your reset link...</p>
          )}

          {status === "invalid" && (
            <div className="mt-10 rounded-3xl border border-red-500/40 bg-red-500/10 p-8">
              <p className="text-lg font-black text-red-300">
                This link isn&apos;t working
              </p>

              <p className="mt-3 leading-7 text-red-200/80">
                Reset links can only be used once and expire after a short
                time. Request a fresh one and try again.
              </p>

              <Link
                href="/forgot-password"
                className="mt-6 inline-block rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-400"
              >
                Get a New Link
              </Link>
            </div>
          )}

          {status === "ready" && (
            <>
              <p className="mt-4 text-zinc-400">
                Choose a new password for your account.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-10 space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-8"
              >
                <div>
                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-zinc-300"
                  >
                    New password
                  </label>

                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  />

                  <p className="mt-2 text-xs text-zinc-500">
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-bold text-zinc-300"
                  >
                    Confirm new password
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-orange-500 px-6 py-4 text-lg font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save New Password"}
                </button>
              </form>
            </>
          )}

          {status === "done" && (
            <div className="mt-10 rounded-3xl border border-green-500/40 bg-green-500/10 p-8">
              <p className="text-lg font-black text-green-300">
                Password updated
              </p>

              <p className="mt-3 leading-7 text-green-200/80">
                You&apos;re signed in. Taking you back to MX Gatepicks...
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}