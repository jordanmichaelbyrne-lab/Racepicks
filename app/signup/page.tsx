"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/client";

export default function SignUpPage() {
  const supabase = useMemo(() => createClient(), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | null
  >(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function checkUsernameAvailability() {
    const cleaned = username.trim();

    if (cleaned.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");

    const { data, error } = await supabase.rpc("is_display_name_taken", {
      check_name: cleaned,
    });

    if (error) {
      // Don't block signup on a check failure — the pre-submit check
      // and the unique index are the real guards; this is just UX.
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus(data ? "taken" : "available");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanedFirstName = firstName.trim();
    const cleanedLastName = lastName.trim();
    const cleanedUsername = username.trim();
    const cleanedEmail = email.trim().toLowerCase();

    setMessage("");
    setMessageType(null);

    if (!cleanedFirstName || !cleanedLastName) {
      setMessage("Please enter your first and last name.");
      setMessageType("error");
      return;
    }

    if (cleanedUsername.length < 3) {
      setMessage("Your username must be at least 3 characters.");
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

    // Final authoritative check right before submit — the on-blur check
    // is just UX; someone else could have taken the name in between.
    const { data: isTaken, error: checkError } = await supabase.rpc(
      "is_display_name_taken",
      { check_name: cleanedUsername }
    );

    if (checkError) {
      setMessage("Could not verify your username. Please try again.");
      setMessageType("error");
      setIsSubmitting(false);
      return;
    }

    if (isTaken) {
      setUsernameStatus("taken");
      setMessage("That username is already taken. Please choose another.");
      setMessageType("error");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: cleanedEmail,
      password,
      options: {
        data: {
          first_name: cleanedFirstName,
          last_name: cleanedLastName,
          display_name: cleanedUsername,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      // Rare race: someone else took the name in the gap between our
      // check and the insert. The database's unique index is the real
      // guard here — this just gives a friendly message instead of a
      // raw database error if that race happens.
      const looksLikeDuplicateName =
        error.message.toLowerCase().includes("duplicate") ||
        error.message.toLowerCase().includes("unique");

      setMessage(
        looksLikeDuplicateName
          ? "That username was just taken by someone else. Please choose another."
          : error.message
      );
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
                htmlFor="username"
                className="text-sm font-bold text-zinc-300"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                required
                minLength={3}
                autoComplete="nickname"
                maxLength={40}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameStatus("idle");
                }}
                onBlur={checkUsernameAvailability}
                className={`mt-2 w-full rounded-2xl border bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500 ${
                  usernameStatus === "taken"
                    ? "border-red-500"
                    : usernameStatus === "available"
                      ? "border-green-500"
                      : "border-zinc-700"
                }`}
                placeholder="e.g. JordanB"
              />

              {usernameStatus === "checking" && (
                <p className="mt-2 text-sm text-zinc-500">
                  Checking availability…
                </p>
              )}

              {usernameStatus === "taken" && (
                <p className="mt-2 text-sm font-bold text-red-400">
                  That username is already taken.
                </p>
              )}

              {usernameStatus === "available" && (
                <p className="mt-2 text-sm font-bold text-green-400">
                  Username is available.
                </p>
              )}

              {usernameStatus === "idle" && (
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  This is the name shown publicly on the leaderboard
                  and banter page. At least 3 characters.
                </p>
              )}
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