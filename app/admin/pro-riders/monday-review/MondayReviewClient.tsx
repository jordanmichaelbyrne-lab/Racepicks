"use client";

import { useState, useTransition } from "react";
import {
  acceptSuggestedSalary,
  rejectSuggestedSalary,
  setSuggestedSalary,
} from "./actions";

type RiderRow = {
  rider_id: string;
  full_name: string;
  race_number: number | null;
  current_salary: number | null;
  suggested_salary: number | null;
};

export default function MondayReviewClient({
  initialRiders,
  season,
}: {
  initialRiders: RiderRow[];
  season: number;
}) {
  const [riders, setRiders] = useState(initialRiders);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateSuggestedLocal(riderId: string, value: string) {
    setRiders((current) =>
      current.map((r) =>
        r.rider_id === riderId
          ? { ...r, suggested_salary: value === "" ? null : Number(value) }
          : r
      )
    );
  }

  function handleAccept(rider: RiderRow) {
    if (rider.suggested_salary === null) return;

    const current = rider.current_salary ?? 0;
    const suggested = rider.suggested_salary;
    const changePct = current ? ((suggested - current) / current) * 100 : 0;

    if (Math.abs(changePct) > 5) {
      const confirmed = window.confirm(
        `This is a ${changePct.toFixed(1)}% change — outside the normal ±5% Monday cap. Accept anyway?`
      );
      if (!confirmed) return;
    }

    setPendingId(rider.rider_id);
    startTransition(async () => {
      const result = await acceptSuggestedSalary(
        rider.rider_id,
        season,
        suggested
      );
      setPendingId(null);
      if (result.success) {
        setReviewedIds((prev) => new Set(prev).add(rider.rider_id));
      }
    });
  }

  function handleReject(rider: RiderRow) {
    setPendingId(rider.rider_id);
    startTransition(async () => {
      const result = await rejectSuggestedSalary(rider.rider_id, season);
      setPendingId(null);
      if (result.success) {
        setReviewedIds((prev) => new Set(prev).add(rider.rider_id));
      }
    });
  }

  function handleSaveSuggestion(rider: RiderRow) {
    if (rider.suggested_salary === null) return;

    setPendingId(rider.rider_id);
    startTransition(async () => {
      await setSuggestedSalary(rider.rider_id, season, rider.suggested_salary!);
      setPendingId(null);
    });
  }

  const pendingRiders = riders.filter((r) => !reviewedIds.has(r.rider_id));
  const reviewedCount = reviewedIds.size;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <p className="font-black">
          {reviewedCount} reviewed · {pendingRiders.length} remaining
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
        <div className="hidden grid-cols-[50px_1fr_120px_140px_100px_90px_90px] gap-3 border-b border-neutral-800 bg-black/40 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-neutral-500 md:grid">
          <div>#</div>
          <div>Rider</div>
          <div className="text-right">Current</div>
          <div className="text-right">Suggested</div>
          <div className="text-right">Change</div>
          <div></div>
          <div></div>
        </div>

        {pendingRiders.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            All riders reviewed for this session. ✓
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {pendingRiders.map((rider) => {
              const current = rider.current_salary ?? 0;
              const suggested = rider.suggested_salary;
              const changePct =
                suggested !== null && current
                  ? ((suggested - current) / current) * 100
                  : null;
              const isRowPending = pendingId === rider.rider_id && isPending;

              return (
                <div
                  key={rider.rider_id}
                  className="grid grid-cols-[40px_1fr_auto] items-center gap-3 px-5 py-4 md:grid-cols-[50px_1fr_120px_140px_100px_90px_90px]"
                >
                  <div className="font-black text-neutral-400">
                    #{rider.race_number ?? "—"}
                  </div>

                  <div className="min-w-0 font-black">{rider.full_name}</div>

                  <div className="hidden text-right font-bold text-neutral-400 md:block">
                    ${current.toFixed(1)}M
                  </div>

                  <div className="text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={suggested ?? ""}
                      onChange={(e) =>
                        updateSuggestedLocal(rider.rider_id, e.target.value)
                      }
                      onBlur={() => handleSaveSuggestion(rider)}
                      placeholder="—"
                      className="w-24 rounded-lg border border-neutral-700 bg-black px-2 py-1.5 text-right font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div
                    className={`hidden text-right text-sm font-bold md:block ${
                      changePct === null
                        ? "text-neutral-600"
                        : changePct > 0
                          ? "text-green-400"
                          : changePct < 0
                            ? "text-red-400"
                            : "text-neutral-500"
                    }`}
                  >
                    {changePct === null
                      ? "—"
                      : `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%`}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAccept(rider)}
                    disabled={suggested === null || isRowPending}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {isRowPending ? "…" : "Accept"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(rider)}
                    disabled={isRowPending}
                    className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-black transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Skip
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}