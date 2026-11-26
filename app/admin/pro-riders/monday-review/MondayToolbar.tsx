"use client";

import { useState, useTransition } from "react";
import {
  acceptAllSuggestedSalaries,
  generateSuggestedSalaries,
  type AutoResult,
} from "./auto-actions";

export default function MondayToolbar({ season }: { season: number }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  function run(
    confirmText: string,
    action: () => Promise<AutoResult>,
    describe: (r: AutoResult) => string
  ) {
    if (!window.confirm(confirmText)) return;

    startTransition(async () => {
      const result = await action();

      if (result.success) {
        setMessage({ ok: true, text: describe(result) });
        // Reload so the list below shows the new numbers.
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setMessage({ ok: false, text: result.error ?? "Something went wrong." });
      }
    });
  }

  return (
    <div className="mb-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
        Quick Tools
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(
              "Fill in suggested prices for every rider from recent results? This replaces any suggestions you've typed. Nothing is applied until you accept.",
              () => generateSuggestedSalaries(season),
              (r) =>
                `✓ ${r.count} suggestion(s) created${
                  r.skipped ? ` — ${r.skipped} rider(s) have no scores yet` : ""
                }.`
            )
          }
          className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Working…" : "Auto-suggest from results"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(
              "Accept every pending suggestion within ±5% and apply the new prices now? This is logged to salary history and can't be undone in one click.",
              () => acceptAllSuggestedSalaries(season),
              (r) =>
                `✓ ${r.count} price(s) applied${
                  r.skipped ? ` — ${r.skipped} outside ±5% left for manual review` : ""
                }.`
            )
          }
          className="rounded-xl border border-green-500 px-5 py-3 text-sm font-black text-green-400 transition hover:bg-green-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          Accept all within ±5%
        </button>
      </div>

      {message && (
        <p
          className={`mt-3 text-sm font-bold ${
            message.ok ? "text-green-400" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        Auto-suggest compares each rider&apos;s last 3 scored rounds with what
        their salary would normally earn. Over-performers move up, under-performers
        down, never more than 5%.
      </p>
    </div>
  );
}