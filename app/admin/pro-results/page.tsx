import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import AdminSubmitButton from "@/app/admin/components/AdminSubmitButton";
import {
  setEventFormat,
  saveRaceResultSlot,
  importRaceResultSlotFromUrl,
  setHoleshotWinner,
} from "./actions";
import CalculateScoresButton from "./CalculateScoresButton";

type PageProps = {
  searchParams: Promise<{
    event?: string;
    season?: string;
    saved?: string;
    matched?: string;
    unmatched?: string;
    holeshotSet?: string;
  }>;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  sx: "Supercross (single race)",
  triple_crown: "Triple Crown SX (3 races + overall)",
  mx: "Pro Motocross (2 motos + overall)",
  smx_playoff_1: "SMX Playoff 1 — single race (×1)",
  smx_playoff_2: "SMX Playoff 2 — single race (×1.5)",
  smx_playoff_3: "SMX Championship Final — 2 motos + overall (×2)",
};

const SLOT_LABELS: Record<string, string> = {
  race_1: "Race 1 / Moto 1",
  race_2: "Race 2 / Moto 2",
  race_3: "Race 3",
  overall: "Official Overall",
};

function slotsForEventType(eventType: string): string[] {
  if (eventType === "triple_crown") return ["race_1", "race_2", "race_3", "overall"];
  if (eventType === "mx" || eventType === "smx_playoff_3") {
    return ["race_1", "race_2", "overall"];
  }
  return ["overall"]; // sx, smx_playoff_1, smx_playoff_2
}

// Holeshot only applies to an actual RACE. In single-race formats
// (SX, SMX Playoff 1/2), "overall" IS the race, so it needs a holeshot
// selector. In multi-slot formats (MX, Triple Crown, SMX Playoff 3),
// "overall" is a separately-classified result, not a race — no
// holeshot applies there, only to race_1/2/3.
function slotNeedsHoleshot(eventType: string, slot: string): boolean {
  if (slot !== "overall") return true;
  return slotsForEventType(eventType).length === 1;
}

export default async function ProResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const season = Number.parseInt(params.season ?? "2027", 10) || 2027;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, series, season, round_number, venue, status")
    .order("race_date", { ascending: true });

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const selectedEventId =
    params.event && (events ?? []).some((e) => e.id === params.event)
      ? params.event
      : (events ?? [])[0]?.id;

  const selectedEvent = (events ?? []).find((e) => e.id === selectedEventId);

  let eventType: string | null = null;

  if (selectedEventId) {
    const { data: configRow } = await supabase
      .from("pro_event_config")
      .select("event_type")
      .eq("event_id", selectedEventId)
      .maybeSingle();

    eventType = configRow?.event_type ?? null;
  }

  let existingCounts: Record<string, number> = {};
  let ridersBySlot: Record<
    string,
    { rider_id: string; full_name: string; had_holeshot: boolean }[]
  > = {};

  if (selectedEventId && eventType) {
    const { data: existingResults } = await supabase
      .from("pro_race_results")
      .select("result_slot, rider_id, had_holeshot, riders(full_name)")
      .eq("event_id", selectedEventId)
      .order("finishing_position", { ascending: true });

    for (const row of existingResults ?? []) {
      existingCounts[row.result_slot] = (existingCounts[row.result_slot] ?? 0) + 1;

      const riderName = Array.isArray(row.riders)
        ? row.riders[0]?.full_name
        : (row.riders as any)?.full_name;

      if (riderName) {
        if (!ridersBySlot[row.result_slot]) ridersBySlot[row.result_slot] = [];
        ridersBySlot[row.result_slot].push({
          rider_id: row.rider_id,
          full_name: riderName,
          had_holeshot: row.had_holeshot,
        });
      }
    }
  }

  const { count: scoredCount } = selectedEventId
    ? await supabase
        .from("pro_round_scores")
        .select("id", { count: "exact", head: true })
        .eq("event_id", selectedEventId)
    : { count: 0 };

  const { count: manufacturerScoredCount } = selectedEventId
    ? await supabase
        .from("pro_manufacturer_round_scores")
        .select("id", { count: "exact", head: true })
        .eq("event_id", selectedEventId)
    : { count: 0 };

  const { data: manufacturerScores } = selectedEventId
    ? await supabase
        .from("pro_manufacturer_round_scores")
        .select("manufacturer, tier, best_position, bonus_points")
        .eq("event_id", selectedEventId)
        .order("bonus_points", { ascending: false })
    : { data: [] };

  // ============================================================
  // Checklist — walks through every step in order, so nothing gets
  // missed on a race weekend.
  // ============================================================
  const requiredSlots = eventType ? slotsForEventType(eventType) : [];
  const holeshotSlots = eventType
    ? requiredSlots.filter((slot) => slotNeedsHoleshot(eventType!, slot))
    : [];

  const allSlotsEntered =
    requiredSlots.length > 0 &&
    requiredSlots.every((slot) => (existingCounts[slot] ?? 0) > 0);

  const allHoleshotsSet =
    holeshotSlots.length > 0 &&
    holeshotSlots.every((slot) =>
      (ridersBySlot[slot] ?? []).some((r) => r.had_holeshot)
    );

  const checklist = selectedEvent
    ? [
        {
          label: "Set Pro scoring format",
          complete: Boolean(eventType),
        },
        {
          label: `Import all result slots (${requiredSlots.length || "?"})`,
          complete: allSlotsEntered,
        },
        {
          label: `Set holeshot winner${holeshotSlots.length > 1 ? "s" : ""} (${holeshotSlots.length || "?"})`,
          complete: eventType ? allHoleshotsSet : false,
        },
        {
          label: "Calculate scores",
          complete: (scoredCount ?? 0) > 0,
        },
        {
          label: "Verify manufacturer bonuses",
          complete: (manufacturerScoredCount ?? 0) > 0,
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Navbar />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
          >
            ← Back to admin dashboard
          </Link>
          <Link
            href={`/admin/pro-riders?season=${season}`}
            className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
          >
            Pro Rider Manager →
          </Link>
        </div>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Race Control · Racepicks Pro
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
            Pro Results Entry
          </h1>
        </header>

        {params.saved && (
          <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
            <p className="font-black text-green-400">
              ✓ Saved {SLOT_LABELS[params.saved] ?? params.saved} — {params.matched} rider(s) matched
            </p>
          </div>
        )}

        {params.holeshotSet && (
          <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
            <p className="font-black text-green-400">
              ✓ Holeshot winner set for {SLOT_LABELS[params.holeshotSet] ?? params.holeshotSet}
            </p>
          </div>
        )}

        {params.unmatched && (
          <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
            <p className="font-black text-orange-400">Some names couldn't be matched:</p>
            <p className="mt-1 text-sm text-orange-300/80">{params.unmatched}</p>
            <p className="mt-2 text-xs text-neutral-500">
              Check spelling matches the rider's exact name in the Pro Rider Manager.
            </p>
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Select Event
              </label>
              <select
                name="event"
                defaultValue={selectedEventId}
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 outline-none focus:border-orange-500"
              >
                {(events ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.season} {e.series} · Round {e.round_number} · {e.venue}
                  </option>
                ))}
              </select>
            </div>
            <input type="hidden" name="season" value={season} />
            <button
              type="submit"
              className="rounded-xl border border-orange-500 px-6 py-3 font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
            >
              Load
            </button>
          </form>
        </section>

        {selectedEvent && (
          <>
            {/* Workflow checklist */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
              <div className="border-b border-neutral-800 px-6 py-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                  Race Weekend Checklist
                </p>
              </div>
              <div className="divide-y divide-neutral-800">
                {checklist.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-neutral-500">
                    Select a Pro scoring format below to see the checklist.
                  </div>
                ) : (
                  checklist.map((item, index) => (
                    <div key={item.label} className="flex items-center gap-4 px-6 py-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                          item.complete
                            ? "border-green-500/40 bg-green-500/10 text-green-400"
                            : "border-neutral-700 bg-neutral-900 text-neutral-500"
                        }`}
                      >
                        {item.complete ? "✓" : index + 1}
                      </div>
                      <p
                        className={`font-bold ${
                          item.complete ? "text-green-300" : "text-neutral-300"
                        }`}
                      >
                        {item.label}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <h2 className="font-black text-orange-500">
                {selectedEvent.venue} — {selectedEvent.series} Round {selectedEvent.round_number}
              </h2>

              <form action={setEventFormat} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <input type="hidden" name="event_id" value={selectedEvent.id} />
                <input type="hidden" name="season" value={season} />
                <div className="flex-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Pro Scoring Format
                  </label>
                  <select
                    name="event_type"
                    defaultValue={eventType ?? ""}
                    required
                    className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 outline-none focus:border-orange-500"
                  >
                    <option value="">Select format…</option>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <AdminSubmitButton
                  pendingText="Saving…"
                  confirmMessage={
                    eventType
                      ? "Changing the scoring format after results exist can make already-entered results not fit the new format's slots. Continue?"
                      : undefined
                  }
                  className="rounded-xl bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400"
                >
                  {eventType ? "Update Format" : "Set Format"}
                </AdminSubmitButton>
              </form>
            </section>

            {eventType && (
              <>
                {slotsForEventType(eventType).map((slot) => {
                  const alreadyHasResults = (existingCounts[slot] ?? 0) > 0;

                  return (
                    <section
                      key={slot}
                      className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-black">{SLOT_LABELS[slot]}</h3>
                        {alreadyHasResults ? (
                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black text-green-400">
                            {existingCounts[slot]} riders saved
                          </span>
                        ) : (
                          <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-black text-neutral-500">
                            Not entered
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-neutral-500">
                        Paste the Racer X results page URL for this slot — e.g.{" "}
                        <code className="text-orange-400">
                          racerxonline.com/mx/2026/thunder-valley/450/moto-1
                        </code>
                      </p>

                      <form
                        action={importRaceResultSlotFromUrl}
                        className="mt-3 flex flex-col gap-2 sm:flex-row"
                      >
                        <input type="hidden" name="event_id" value={selectedEvent.id} />
                        <input type="hidden" name="result_slot" value={slot} />
                        <input type="hidden" name="season" value={season} />
                        <input
                          type="url"
                          name="source_url"
                          placeholder="https://racerxonline.com/..."
                          required
                          className="flex-1 rounded-xl border border-neutral-700 bg-black px-4 py-3 text-sm outline-none focus:border-orange-500"
                        />
                        <AdminSubmitButton
                          pendingText="Importing…"
                          confirmMessage={
                            alreadyHasResults
                              ? `${SLOT_LABELS[slot]} already has ${existingCounts[slot]} results saved. Re-importing will overwrite them (holeshot stays intact). Continue?`
                              : undefined
                          }
                          className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-400"
                        >
                          Import from Racer X
                        </AdminSubmitButton>
                      </form>

                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs font-bold text-neutral-500 hover:text-neutral-300">
                          Or paste results manually instead
                        </summary>

                        <form action={saveRaceResultSlot} className="mt-3">
                          <input type="hidden" name="event_id" value={selectedEvent.id} />
                          <input type="hidden" name="result_slot" value={slot} />
                          <input type="hidden" name="season" value={season} />
                          <textarea
                            name="paste_text"
                            rows={6}
                            placeholder={"1. Jett Lawrence\n2. Chase Sexton\n3. Cooper Webb\n..."}
                            className="w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 font-mono text-sm outline-none focus:border-orange-500"
                          />
                          <AdminSubmitButton
                            pendingText="Saving…"
                            confirmMessage={
                              alreadyHasResults
                                ? `${SLOT_LABELS[slot]} already has ${existingCounts[slot]} results saved. This will overwrite them. Continue?`
                                : undefined
                            }
                            className="mt-3 rounded-xl border border-orange-500 px-6 py-2.5 text-sm font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
                          >
                            Save Manually
                          </AdminSubmitButton>
                        </form>
                      </details>

                      {slotNeedsHoleshot(eventType, slot) &&
                        ridersBySlot[slot] &&
                        ridersBySlot[slot].length > 0 && (
                          <div className="mt-5 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                            <p className="text-xs font-black uppercase tracking-widest text-orange-400">
                              Holeshot Winner
                            </p>
                            <form
                              action={setHoleshotWinner}
                              className="mt-2 flex flex-col gap-2 sm:flex-row"
                            >
                              <input type="hidden" name="event_id" value={selectedEvent.id} />
                              <input type="hidden" name="result_slot" value={slot} />
                              <input type="hidden" name="season" value={season} />
                              <select
                                name="rider_id"
                                defaultValue={
                                  ridersBySlot[slot].find((r) => r.had_holeshot)?.rider_id ?? ""
                                }
                                className="flex-1 rounded-xl border border-neutral-700 bg-black px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                              >
                                <option value="">Select rider…</option>
                                {ridersBySlot[slot].map((r) => (
                                  <option key={r.rider_id} value={r.rider_id}>
                                    {r.full_name}
                                  </option>
                                ))}
                              </select>
                              <AdminSubmitButton
                                pendingText="Saving…"
                                className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-black transition hover:bg-orange-400"
                              >
                                Set Holeshot
                              </AdminSubmitButton>
                            </form>
                          </div>
                        )}
                    </section>
                  );
                })}

                <section className="mt-6 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-black text-orange-300">Calculate Scores</h3>
                      <p className="mt-1 text-sm text-orange-200/70">
                        {scoredCount
                          ? `${scoredCount} rider(s) already scored — recalculating will update all of them.`
                          : "Reads every entered result slot and calculates each rider's final Pro score, plus manufacturer bonuses."}
                      </p>
                      {!allSlotsEntered && (
                        <p className="mt-1 text-xs text-orange-300/60">
                          ⚠️ Not all result slots have been entered yet — scores may be incomplete.
                        </p>
                      )}
                    </div>
                    <CalculateScoresButton eventId={selectedEvent.id} season={season} />
                  </div>
                </section>

                {manufacturerScores && manufacturerScores.length > 0 && (
                  <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
                    <div className="border-b border-neutral-800 px-6 py-4">
                      <h3 className="font-black text-orange-500">
                        Manufacturer Bonus — This Round
                      </h3>
                    </div>
                    <div className="divide-y divide-neutral-800">
                      {manufacturerScores.map((m) => (
                        <div
                          key={m.manufacturer}
                          className="flex items-center justify-between px-6 py-3"
                        >
                          <div>
                            <span className="font-black">{m.manufacturer}</span>
                            <span className="ml-2 rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-bold text-neutral-400">
                              Tier {m.tier ?? "?"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-neutral-500">
                              Best: P{m.best_position}
                            </span>
                            <span className="font-black text-orange-400">
                              +{m.bonus_points}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}