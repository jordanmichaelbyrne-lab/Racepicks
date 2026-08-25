"use client";

import { useState, useTransition } from "react";
import { calculateProRoundScores } from "./scoring-engine";

export default function CalculateScoresButton({
  eventId,
  season,
}: {
  eventId: string;
  season: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
    ridersScored?: number;
    manufacturersScored?: number;
  } | null>(null);

  function handleClick() {
    const confirmed = window.confirm(
      "Calculate scores for this event? This reads all entered results and will overwrite any existing scores for this event."
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await calculateProRoundScores(eventId, season);
      setResult(res);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-xl bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Calculating…
          </span>
        ) : (
          "Calculate Scores"
        )}
      </button>

      {result && (
        <p
          className={`text-sm font-bold ${
            result.success ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.success
            ? `✓ Scored ${result.ridersScored} rider(s), ${result.manufacturersScored} manufacturer(s)`
            : `✗ ${result.error}`}
        </p>
      )}
    </div>
  );
}