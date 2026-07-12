"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/client";

export default function SignUpPage() {
  const supabase = createClient();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      display_name: displayName,
    },
    emailRedirectTo: `${window.location.origin}/login`,
  },
});

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setMessage(
      "Account created. Check your email and confirm your account before signing in."
    );

    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto max-w-lg py-16">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Join Racepicks
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            Create Account
          </h1>

          <p className="mt-4 text-zinc-400">
            Create your player profile and enter the 2027 competitions.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-8"
          >
            <div>
              <label
                htmlFor="displayName"
                className="text-sm font-bold text-zinc-300"
              >
                Display name
              </label>

              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                placeholder="Jordan"
              />
            </div>

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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-bold text-zinc-300"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                placeholder="Minimum 8 characters"
              />
            </div>

            {message && (
              <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-orange-500 px-6 py-4 text-lg font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-zinc-400">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-bold text-orange-500 hover:text-orange-400"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}