"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto max-w-lg py-16">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Welcome Back
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            Sign In
          </h1>

          <p className="mt-4 text-zinc-400">
            Sign in to manage your competitions and picks.
          </p>

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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>

            {message && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-orange-500 px-6 py-4 text-lg font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-zinc-400">
            New to Racepicks?{" "}
            <Link
              href="/signup"
              className="font-bold text-orange-500 hover:text-orange-400"
            >
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}