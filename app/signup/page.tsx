"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/client";

export default function SignUpPage() {
  const supabase = useMemo(() => createClient(), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | null
  >(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanedFirstName = firstName.trim();
    const cleanedLastName = lastName.trim();
    const cleanedDisplayName = displayName.trim();
    const cleanedEmail = email.trim().toLowerCase();

    setMessage("");
    setMessageType(null);

    if (!cleanedFirstName || !cleanedLastName) {
      setMessage("Please enter your first and last name.");
      setMessageType("error");
      return;
    }

    if (password.length < 8) {
      setMessage(
        "Your password must contain at least 8 characters."
      );
      setMessageType("error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords don't match. Please check and try again.");
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);

    const publicDisplayName =
      cleanedDisplayName ||
      `${cleanedFirstName} ${cleanedLastName}`;

    const { error } = await supabase.auth.signUp({
      email: cleanedEmail,
      password,
      options: {
        data: {
          first_name: cleanedFirstName,
          last_name: cleanedLastName,
          display_name: publicDisplayName,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setIsSubmitting(false);
      return;
    }

    setMessage(
      "Account created. Check your email and confirm your account before signing in."
    );

    setMessageType("success");
    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Navbar />

        <section className="mx-auto max-w-xl py-16">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Join Racepicks
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            Create Account
          </h1>

          <p className="mt-4 leading-7 text-zinc-400">
            Create your player profile and join the current
            Racepicks competitions.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="text-sm font-bold text-zinc-300"
                >
                  First name
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  placeholder="Jordan"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="text-sm font-bold text-zinc-300"
                >
                  Last name
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  placeholder="Byrne"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="displayName"
                className="text-sm font-bold text-zinc-300"
              >
                Display name{" "}
                <span className="font-normal text-zinc-500">
                  — optional
                </span>
              </label>

              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="nickname"
                maxLength={40}
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                placeholder="Jordan B"
              />

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                This is the name shown publicly on the leaderboard
                and banter page. Leave it blank to use your full name.
              </p>
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
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
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
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-sm font-bold text-zinc-300"
              >
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                placeholder="Re-enter your password"
              />
            </div>

            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                  messageType === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-300"
                    : "border-orange-500/40 bg-orange-500/10 text-orange-300"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-orange-500 px-6 py-4 text-lg font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Creating Account..."
                : "Create Account"}
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