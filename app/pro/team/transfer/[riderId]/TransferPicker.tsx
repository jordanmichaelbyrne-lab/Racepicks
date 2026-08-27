"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { executeTransfer } from "./actions";
import ConfirmModal from "@/app/components/ConfirmModal";

type Rider = {
  rider_id: string;
  full_name: string;
  race_number: number | null;
  classification: string;
  salary: number;
  trend: { direction: "up" | "down" | "flat" | "none"; changePercent: number | null };
};

export default function TransferPicker({
  teamId,
  season,
  outgoingRider,
  restOfRosterValue,
  tokensRemaining,
  isFreeTransfer,
  freeTransferReason,
  eligibleRiders,
}: {
  teamId: string;
  season: number;
  outgoingRider: { rider_id: string; full_name: string; classification: string; salary: number };
  restOfRosterValue: number;
  tokensRemaining: { factory: number; challenger: number };
  isFreeTransfer: boolean;
  freeTransferReason: string | null;
  eligibleRiders: Rider[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [switchStructure, setSwitchStructure] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const targetClassification = switchStructure
    ? outgoingRider.classification === "factory"
      ? "challenger"
      : "factory"
    : outgoingRider.classification;

  const visibleRiders = eligibleRiders
    .filter((r) => r.classification === targetClassification)
    .filter((r) => r.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.salary - a.salary);

  const selectedRider = eligibleRiders.find((r) => r.rider_id === selectedId);
  const newTotal = restOfRosterValue + (selectedRider?.salary ?? 0);
  const overCap = newTotal > 31.0;

  const tokensNeeded = isFreeTransfer
    ? null
    : switchStructure
      ? { factory: 1, challenger: 1 }
      : outgoingRider.classification === "factory"
        ? { factory: 1, challenger: 0 }
        : { factory: 0, challenger: 1 };

  const notEnoughTokens =
    tokensNeeded !== null &&
    (tokensNeeded.factory > tokensRemaining.factory ||
      tokensNeeded.challenger > tokensRemaining.challenger);

  const tokenSummary = isFreeTransfer
    ? `a FREE transfer (${freeTransferReason === "injury" ? "confirmed injury" : "missed SMX qualification"}) — no season token used`
    : switchStructure
      ? "1 Factory token AND 1 Challenger token (structure change)"
      : `1 ${outgoingRider.classification === "factory" ? "Factory" : "Challenger"} token`;

  function handleConfirmClick() {
    if (!selectedId || !selectedRider) {
      setError("Select a replacement rider.");
      return;
    }
    if (overCap) {
      setError("This swap would put your team over the $31.0M cap.");
      return;
    }
    if (notEnoughTokens) {
      setError("Not enough transfer tokens remaining for this swap.");
      return;
    }

    setError(null);
    setShowConfirm(true);
  }

  function handleConfirmedTransfer() {
    if (!selectedId) return;

    startTransition(async () => {
      const result = await executeTransfer(teamId, season, outgoingRider.rider_id, selectedId);

      if (result.success) {
        router.push("/pro/team");
      } else {
        setShowConfirm(false);
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div>
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          Transferring Out
        </p>
        <p className="mt-2 text-xl font-black">{outgoingRider.full_name}</p>
        <p className="mt-1 text-sm text-neutral-400">
          {outgoingRider.classification} · ${outgoingRider.salary.toFixed(1)}M
        </p>
      </div>

      {isFreeTransfer ? (
        <div className="mt-4 rounded-2xl border border-green-500/40 bg-green-500/10 p-4">
          <p className="font-black text-green-400">🎁 Free Transfer Available</p>
          <p className="mt-1 text-sm text-green-300/80">
            {freeTransferReason === "injury"
              ? "This rider has a confirmed injury — this swap won't use one of your season tokens."
              : "This rider didn't qualify for SMX Playoffs — this swap won't use one of your season tokens."}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-neutral-800 bg-black p-4">
          <input
            type="checkbox"
            id="switch-structure"
            checked={switchStructure}
            onChange={(e) => {
              setSwitchStructure(e.target.checked);
              setSelectedId(null);
            }}
            className="h-5 w-5 accent-orange-500"
          />
          <label htmlFor="switch-structure" className="text-sm font-bold">
            Also switch structure (replace with the opposite classification —
            uses 1 Factory + 1 Challenger token instead of 1)
          </label>
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          Choose a {targetClassification} replacement
        </p>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search riders…"
          className="mt-3 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-sm outline-none focus:border-orange-500"
        />

        <div className="mt-3 max-h-[400px] overflow-y-auto rounded-2xl border border-neutral-800">
          <div className="divide-y divide-neutral-800">
            {visibleRiders.map((rider) => {
              const isSelected = selectedId === rider.rider_id;
              const wouldExceedCap = restOfRosterValue + rider.salary > 31.0;

              return (
                <button
                  key={rider.rider_id}
                  type="button"
                  onClick={() => setSelectedId(rider.rider_id)}
                  className={`flex w-full items-center justify-between px-5 py-3 text-left transition ${
                    isSelected
                      ? "bg-orange-500/10"
                      : wouldExceedCap
                        ? "cursor-not-allowed bg-neutral-950 opacity-40"
                        : "bg-neutral-950 hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 font-black text-neutral-500">
                      #{rider.race_number ?? "—"}
                    </span>
                    <p className="font-black">{rider.full_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-orange-500">${rider.salary}M</span>
                    {rider.trend.direction === "up" && (
                      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-black text-green-400">
                        ▲ {Math.abs(rider.trend.changePercent ?? 0).toFixed(1)}%
                      </span>
                    )}
                    {rider.trend.direction === "down" && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-400">
                        ▼ {Math.abs(rider.trend.changePercent ?? 0).toFixed(1)}%
                      </span>
                    )}
                    {rider.trend.direction === "flat" && (
                      <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                        0.0%
                      </span>
                    )}
                    {rider.trend.direction === "none" && (
                      <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                        —
                      </span>
                    )}
                    {isSelected && <span className="text-green-400">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedRider && (
        <div
          className={`mt-4 rounded-2xl border p-4 ${
            overCap ? "border-red-500/40 bg-red-500/10" : "border-neutral-800 bg-neutral-950"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            New Team Value
          </p>
          <p className={`mt-1 text-xl font-black ${overCap ? "text-red-400" : "text-orange-500"}`}>
            ${newTotal.toFixed(1)}M {overCap && "— over cap"}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-bold text-red-400">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirmClick}
        disabled={isPending || !selectedId}
        className="mt-6 w-full rounded-full bg-orange-500 px-7 py-4 font-black uppercase text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processing Transfer…
          </span>
        ) : (
          "Confirm Transfer"
        )}
      </button>

      {showConfirm && selectedRider && (
        <ConfirmModal
          title="Confirm This Transfer?"
          warning={`This will permanently use ${tokenSummary}. This action cannot be undone.`}
          confirmLabel="Yes, Make This Transfer"
          isPending={isPending}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmedTransfer}
          details={
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-bold text-neutral-500">Transferring Out</span>
                <span className="font-bold text-red-400">{outgoingRider.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-neutral-500">Transferring In</span>
                <span className="font-bold text-green-400">{selectedRider.full_name}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-2">
                <span className="font-bold text-neutral-500">Tokens Used</span>
                <span className="font-bold text-orange-400">{tokenSummary}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-neutral-500">New Team Value</span>
                <span className="font-bold text-orange-400">${newTotal.toFixed(1)}M</span>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}