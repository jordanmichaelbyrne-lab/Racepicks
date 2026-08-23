"use client";

import { useState, useTransition } from "react";
import { submitProInterest } from "./actions";

const pricingOptions = [
  "$2 / week",
  "$3 / week",
  "$4 / week",
  "$5 / week",
  "I wouldn't pay for Pro",
];

const interestOptions = ["Definitely", "Maybe — tell me more", "Not for me"];

const featureOptions = [
  "Bigger prize pools",
  "Team Manager gameplay",
  "Competing with mates",
  "Strategy & stats",
  "Pro Championship",
];

function PollButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-5 py-4 text-sm font-black transition ${
        selected
          ? "border-orange-500 bg-orange-500 text-black"
          : "border-zinc-700 bg-black text-white hover:border-orange-500 hover:text-orange-500"
      }`}
    >
      {label}
    </button>
  );
}

export default function ProPollForm() {
  const [interest, setInterest] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleFeature(feature: string) {
    setFeatures((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature]
    );
  }

  function handleSubmit() {
    if (!interest) {
      setError("Please answer question 1 before submitting.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await submitProInterest({
        interest,
        price,
        features,
        email: email.trim() || null,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
        <p className="text-2xl font-black text-green-400">
          Thanks for the feedback! 🏁
        </p>
        <p className="mt-2 text-sm text-green-300/70">
          Your response helps shape whether and how Racepicks Pro gets
          built.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-4xl space-y-10">
      <div>
        <p className="text-sm font-black uppercase tracking-widest text-white">
          1. Would you play Racepicks Pro?
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {interestOptions.map((option) => (
            <PollButton
              key={option}
              label={option}
              selected={interest === option}
              onClick={() => setInterest(option)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-black uppercase tracking-widest text-white">
          2. What would Racepicks Pro be worth to you?
        </p>

        <p className="mt-2 text-sm text-zinc-500">
          Think of it as the cost per week across the full SMX season.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pricingOptions.map((option) => (
            <PollButton
              key={option}
              label={option}
              selected={price === option}
              onClick={() => setPrice(option)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-black uppercase tracking-widest text-white">
          3. What interests you most?
        </p>

        <p className="mt-2 text-sm text-zinc-500">
          Select as many as you like.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {featureOptions.map((option) => (
            <PollButton
              key={option}
              label={option}
              selected={features.includes(option)}
              onClick={() => toggleFeature(option)}
            />
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="pro-email"
          className="text-sm font-black uppercase tracking-widest text-white"
        >
          Optional — want an email when Pro launches?
        </label>

        <input
          id="pro-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@email.com"
          className="mt-3 w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-sm font-bold text-red-400">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full rounded-full bg-orange-500 px-7 py-4 font-black uppercase text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Submitting…
          </span>
        ) : (
          "Submit My Response"
        )}
      </button>
    </div>
  );
}