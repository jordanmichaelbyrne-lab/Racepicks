"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsSubmitting(false);

    if (error) {
      // Supabase does not reveal whether an email has an account. The only
      // errors we normally see here are things like rate limits.
      setErrorMessage(
        error.message || "Something went wrong. Please try again."
      );
      return;
    }

    setIsSent(true);
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
            Reset Password
          </h1>

          <p className="mt-4 text-zinc-400">
            Enter the email you signed up with and we&apos;ll send you a link
            to choose a new password.
          </p>

          {isSent ? (
            <div className="mt-10 rounded-3xl border border-green-500/40 bg-green-500/10 p-8">
              <p className="text-lg font-black text-green-300">
                Check your email
              </p>

              <p className="mt-3 leading-7 text-green-200/80">
                If an account exists for{" "}
                <span className="font-bold text-white">{email.trim()}</span>,
                we&apos;ve sent a link to reset your password. It can take a
                minute or two to arrive, so check your spam or junk folder
                too.
              </p>

              <Link
                href="/login"
                className="mt-6 inline-block rounded-full border border-zinc-700 px-6 py-3 text-sm font-black text-white transition hover:border-orange-500"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-8"
            >
              <div>
                <label
                  htmlFor="email"
                  className="text-sm font-bold text-zinc-300"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          {!isSent && (
            <p className="mt-6 text-center text-zinc-400">
              Remembered it?{" "}
              <Link
                href="/login"
                className="font-bold text-orange-500 hover:text-orange-400"
              >
                Back to Sign In
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}