"use client";

import { useState, useTransition } from "react";
import { saveTeam } from "./actions";
import ConfirmModal from "@/app/components/ConfirmModal";

const SALARY_CAP = 31.0;

type Rider = {
  rider_id: string;
  full_name: string;
  race_number: number | null;
  classification: string;
  salary: number;
  manufacturer: string | null;
  trend?: { direction: "up" | "down" | "flat" | "none"; changePercent: number | null };
};

type BonusRow = {
  tier: string;
  minPosition: number;
  maxPosition: number;
  bonusPoints: number;
};

type ChallengerBonusRow = {
  resultType: string;
  minPosition: number;
  maxPosition: number;
  bonusPoints: number;
};

export default function TeamBuilder({
  riders,
  season,
  manufacturers,
  manufacturersByTier,
  bonusTable,
  challengerBonusTable,
}: {
  riders: Rider[];
  season: number;
  manufacturers: string[];
  manufacturersByTier: Record<string, string[]>;
  bonusTable: BonusRow[];
  challengerBonusTable: ChallengerBonusRow[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manufacturer, setManufacturer] = useState("");
  const [teamName, setTeamName] = useState("");
  const [filter, setFilter] = useState<"all" | "factory" | "challenger">("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedRiders = riders.filter((r) => selectedIds.includes(r.rider_id));
  const totalCost = selectedRiders.reduce((sum, r) => sum + r.salary, 0);
  const remaining = SALARY_CAP - totalCost;
  const factoryCount = selectedRiders.filter((r) => r.classification === "factory").length;
  const challengerCount = selectedRiders.filter((r) => r.classification === "challenger").length;

  const structureValid =
    selectedIds.length !== 5 ||
    (factoryCount >= 2 && factoryCount <= 3 && challengerCount >= 2 && challengerCount <= 3);

  const canAddMore = selectedIds.length < 5;

  function toggleRider(riderId: string, salary: number) {
    setError(null);
    setSelectedIds((current) => {
      if (current.includes(riderId)) {
        return current.filter((id) => id !== riderId);
      }
      if (current.length >= 5) return current;
      if (totalCost + salary > SALARY_CAP) return current;
      return [...current, riderId];
    });
  }

  const visibleRiders = riders
    .filter((r) => filter === "all" || r.classification === filter)
    .filter((r) => r.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.salary - a.salary);

  function handleSubmitClick() {
    if (selectedIds.length !== 5) {
      setError("Select exactly 5 riders.");
      return;
    }
    if (!structureValid) {
      setError(`Invalid structure: ${factoryCount} Factory / ${challengerCount} Challenger. Need 2-3 of each.`);
      return;
    }
    if (!manufacturer) {
      setError("Select a manufacturer.");
      return;
    }

    setError(null);
    setShowConfirm(true);
  }

  function handleConfirmedSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("season", String(season));
      formData.set("manufacturer", manufacturer);
      formData.set("team_name", teamName);
      selectedIds.forEach((id) => formData.append("rider_ids", id));

      const result = await saveTeam(formData);

      if (result.success) {
        setShowConfirm(false);
        setSuccess(true);
      } else {
        setShowConfirm(false);
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
        <p className="text-2xl font-black text-green-400">Team Saved! 🏁</p>
        <p className="mt-2 text-sm text-green-300/70">
          Refresh the page to see your team.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-4 z-20 mb-6 rounded-2xl border border-orange-500 bg-black/95 p-5 shadow-lg backdrop-blur">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Selected</p>
            <p className="text-2xl font-black">{selectedIds.length} / 5</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Spent</p>
            <p className="text-2xl font-black text-orange-500">${totalCost.toFixed(1)}M</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Remaining</p>
            <p className={`text-2xl font-black ${remaining < 0 ? "text-red-400" : "text-green-400"}`}>
              ${remaining.toFixed(1)}M
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Structure</p>
            <p className={`text-2xl font-black ${structureValid ? "text-green-400" : "text-red-400"}`}>
              {factoryCount}F / {challengerCount}C
            </p>
          </div>
        </div>

        {selectedRiders.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-800 pt-4">
            {selectedRiders.map((r) => (
              <button
                key={r.rider_id}
                type="button"
                onClick={() => toggleRider(r.rider_id, r.salary)}
                className="flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-300 transition hover:border-red-500 hover:text-red-400"
              >
                {r.full_name} · ${r.salary}M
                <span>✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Team Name (optional)
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Byrne Racing"
            className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Manufacturer Pick — locked once saved
          </label>
          <select
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 outline-none focus:border-orange-500"
          >
            <option value="">Select manufacturer…</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Manufacturer bonus + Challenger bonus — matching cards, side by side */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        {(() => {
          const selectedTier = Object.entries(manufacturersByTier).find(([, mans]) =>
            mans.includes(manufacturer)
          )?.[0];

          const tiers = ["A", "B", "C", "D"];
          const bands = [
            { label: "1st", min: 1, max: 1 },
            { label: "2nd-3rd", min: 2, max: 3 },
            { label: "4th-5th", min: 4, max: 5 },
            { label: "6th-10th", min: 6, max: 10 },
            { label: "11th-15th", min: 11, max: 15 },
          ];

          function pointsFor(tier: string, min: number, max: number) {
            const row = bonusTable.find(
              (b) => b.tier === tier && b.minPosition === min && b.maxPosition === max
            );
            return row?.bonusPoints ?? 0;
          }

          return (
            <div className="flex flex-col rounded-xl border border-neutral-800 bg-black p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                Manufacturer bonus — best finish that round
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="pb-1 text-left font-bold text-neutral-500">Position</th>
                      {tiers.map((t) => (
                        <th
                          key={t}
                          className={`pb-1 text-right font-bold ${
                            selectedTier === t ? "text-orange-400" : "text-neutral-500"
                          }`}
                        >
                          Tier {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bands.map((band) => (
                      <tr key={band.label}>
                        <td className="py-0.5 text-neutral-400">{band.label}</td>
                        {tiers.map((t) => (
                          <td
                            key={t}
                            className={`py-0.5 text-right font-bold ${
                              selectedTier === t ? "text-orange-400" : "text-neutral-300"
                            }`}
                          >
                            +{pointsFor(t, band.min, band.max)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                Tier A: {manufacturersByTier["A"]?.join(", ")} · Tier B:{" "}
                {manufacturersByTier["B"]?.join(", ")} · Tier C:{" "}
                {manufacturersByTier["C"]?.join(", ")} · Tier D:{" "}
                {manufacturersByTier["D"]?.join(", ")}
              </p>
            </div>
          );
        })()}

        <div className="flex flex-col rounded-xl border border-neutral-800 bg-black p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Challenger bonus — extra points on finish
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="pb-1 text-left font-bold text-neutral-500">Finish</th>
                  <th className="pb-1 text-right font-bold text-orange-400">Single Event</th>
                  <th className="pb-1 text-right font-bold text-neutral-500">Per Leg</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const overallRows = challengerBonusTable.filter((r) => r.resultType === "overall");
                  return overallRows.map((row) => {
                    const motoRow = challengerBonusTable.find(
                      (r) =>
                        r.resultType === "moto" &&
                        r.minPosition === row.minPosition &&
                        r.maxPosition === row.maxPosition
                    );
                    const label =
                      row.minPosition === row.maxPosition
                        ? `${row.minPosition}${row.minPosition === 1 ? "st" : row.minPosition === 2 ? "nd" : row.minPosition === 3 ? "rd" : "th"}`
                        : `${row.minPosition}-${row.maxPosition}`;
                    return (
                      <tr key={label}>
                        <td className="py-0.5 text-neutral-400">{label}</td>
                        <td className="py-0.5 text-right font-bold text-orange-400">
                          +{row.bonusPoints}
                        </td>
                        <td className="py-0.5 text-right font-bold text-neutral-400">
                          +{motoRow?.bonusPoints ?? 0}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            Challengers earn this on top of normal finishing points — a Challenger
            finishing top 3 scores a real bonus a Factory rider doesn't get.
          </p>
          <p className="mt-2 text-[11px] text-neutral-500">
            <span className="font-bold text-neutral-400">Single Event</span> applies to a
            normal one-race round like Supercross. For multi-part rounds (Pro Motocross,
            Triple Crown), <span className="font-bold text-neutral-400">Per Leg</span>{" "}
            applies to each individual moto/race, on top of the Single Event bonus
            applied once to the combined overall result.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "factory", "challenger"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase transition ${
                filter === f
                  ? "bg-orange-500 text-black"
                  : "border border-neutral-700 text-neutral-400 hover:border-orange-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search riders…"
          className="rounded-xl border border-neutral-700 bg-black px-4 py-2 text-sm outline-none focus:border-orange-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <div className="max-h-[500px] divide-y divide-neutral-800 overflow-y-auto">
          {visibleRiders.map((rider) => {
            const isSelected = selectedIds.includes(rider.rider_id);
            const wouldExceedCap = !isSelected && totalCost + rider.salary > SALARY_CAP;
            const isFull = !isSelected && !canAddMore;
            const disabled = wouldExceedCap || isFull;

            return (
              <button
                key={rider.rider_id}
                type="button"
                onClick={() => toggleRider(rider.rider_id, rider.salary)}
                disabled={disabled}
                className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition ${
                  isSelected
                    ? "bg-orange-500/10"
                    : disabled
                      ? "cursor-not-allowed bg-neutral-950 opacity-40"
                      : "bg-neutral-950 hover:bg-neutral-900"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-10 shrink-0 font-black text-neutral-500">
                    #{rider.race_number ?? "—"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black">{rider.full_name}</p>
                    <p className="text-xs text-neutral-500">
                      {rider.manufacturer ?? "—"} ·{" "}
                      <span
                        className={
                          rider.classification === "factory" ? "text-white" : "text-orange-400"
                        }
                      >
                        {rider.classification}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-black text-orange-500">${rider.salary}M</span>
                  {rider.trend?.direction === "up" && (
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-black text-green-400">
                      ▲ {Math.abs(rider.trend.changePercent ?? 0).toFixed(1)}%
                    </span>
                  )}
                  {rider.trend?.direction === "down" && (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-400">
                      ▼ {Math.abs(rider.trend.changePercent ?? 0).toFixed(1)}%
                    </span>
                  )}
                  {rider.trend?.direction === "flat" && (
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                      0.0%
                    </span>
                  )}
                  {(!rider.trend || rider.trend.direction === "none") && (
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

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-bold text-red-400">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmitClick}
        disabled={isPending}
        className="mt-6 w-full rounded-full bg-orange-500 px-7 py-4 font-black uppercase text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Saving Team…
          </span>
        ) : (
          "Save My Team"
        )}
      </button>

      {showConfirm && (
        <ConfirmModal
          title="Lock In Your Team?"
          warning="Once saved, your 5 riders and manufacturer pick are locked for the season. You can't edit this team directly — only future transfers can change your riders."
          confirmLabel="Yes, Save My Team"
          isPending={isPending}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmedSave}
          details={
            <div className="space-y-2">
              <div>
                <span className="font-bold text-neutral-500">Riders ({selectedRiders.length}/5):</span>
                <ul className="mt-1 space-y-0.5">
                  {selectedRiders.map((r) => (
                    <li key={r.rider_id} className="flex justify-between">
                      <span>
                        {r.full_name}{" "}
                        <span
                          className={
                            r.classification === "factory" ? "text-neutral-400" : "text-orange-400"
                          }
                        >
                          ({r.classification})
                        </span>
                      </span>
                      <span className="font-bold text-orange-400">${r.salary}M</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-2">
                <span className="font-bold text-neutral-500">Manufacturer</span>
                <span className="font-bold text-orange-400">{manufacturer}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-neutral-500">Total Cost</span>
                <span className="font-bold text-orange-400">${totalCost.toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-neutral-500">Structure</span>
                <span className="font-bold">
                  {factoryCount}F / {challengerCount}C
                </span>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}