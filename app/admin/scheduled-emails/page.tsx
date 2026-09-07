import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

type CurrentEvent = {
  id: string;
  venue: string;
  series: string;
  season: number;
  round_number: number;
  race_date: string;
  picks_close_at: string;
};

type LogRow = {
  id: string;
  email_type: string;
  status: string;
  event_id: string | null;
  recipients_count: number | null;
  failed_count: number | null;
  message: string | null;
  created_at: string;
};

// Queensland does not observe daylight saving, so Brisbane is always
// a fixed UTC+10 — this lets "next Monday 6pm Brisbane" be computed
// with simple offset math rather than needing full IANA timezone
// handling for DST transitions.
const BRISBANE_OFFSET_HOURS = 10;

function nextBrisbaneOccurrence(
  targetWeekday: number,
  targetHour: number,
  targetMinute = 0
) {
  const nowUtc = new Date();
  const nowBrisbane = new Date(
    nowUtc.getTime() + BRISBANE_OFFSET_HOURS * 60 * 60 * 1000
  );

  const candidate = new Date(nowBrisbane);
  candidate.setUTCHours(targetHour, targetMinute, 0, 0);

  let dayDiff = (targetWeekday - candidate.getUTCDay() + 7) % 7;

  if (dayDiff === 0 && candidate.getTime() <= nowBrisbane.getTime()) {
    dayDiff = 7;
  }

  candidate.setUTCDate(candidate.getUTCDate() + dayDiff);

  return new Date(
    candidate.getTime() - BRISBANE_OFFSET_HOURS * 60 * 60 * 1000
  );
}

// For daily (not weekday-specific) jobs, like the new-player digest.
function nextBrisbaneDailyOccurrence(targetHour: number, targetMinute = 0) {
  const nowUtc = new Date();
  const nowBrisbane = new Date(
    nowUtc.getTime() + BRISBANE_OFFSET_HOURS * 60 * 60 * 1000
  );

  const candidate = new Date(nowBrisbane);
  candidate.setUTCHours(targetHour, targetMinute, 0, 0);

  if (candidate.getTime() <= nowBrisbane.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  return new Date(
    candidate.getTime() - BRISBANE_OFFSET_HOURS * 60 * 60 * 1000
  );
}

function formatBrisbane(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(date);
}

function formatLogDateTime(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

function formatEmailType(emailType: string) {
  return emailType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusBadgeStyle(status: string) {
  if (status === "sent") return "border-green-500/30 bg-green-500/10 text-green-400";
  if (status === "skipped") return "border-zinc-700 bg-zinc-900 text-zinc-400";
  if (status === "no_event") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  return "border-red-500/30 bg-red-500/10 text-red-400";
}

export default async function AdminScheduledEmailsPage() {
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

  const { data: currentEventData } = await supabase
    .from("events")
    .select("id, venue, series, season, round_number, race_date, picks_close_at")
    .eq("status", "open")
    .order("race_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const currentEvent = currentEventData as CurrentEvent | null;

  const daysUntilRace = currentEvent
    ? (new Date(currentEvent.race_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
    : null;

  // Mirrors each cron route's own skip threshold exactly, so this
  // preview can never silently drift out of sync with what the route
  // will actually do.
  const scheduledReminders = [
    {
      key: "picks_open_reminder",
      label: "Picks Open Reminder",
      description: "Sent to every player once picks open for the week.",
      weekday: 1, // Monday
      hour: 18,
      minute: 0,
      thresholdDays: 6,
      audienceNote: "All players",
    },
    {
      key: "final_reminder",
      label: "Final Reminder",
      description: "Sent only to players who haven't picked yet.",
      weekday: 5, // Friday
      hour: 12,
      minute: 0,
      thresholdDays: 2,
      audienceNote: "Unpicked players only",
    },
    {
      key: "closing_soon_reminder",
      label: "Closing Soon Reminder",
      description: "Sent ~6 hours before picks close, unpicked players only.",
      weekday: 6, // Saturday
      hour: 16,
      minute: 0,
      thresholdDays: 1,
      audienceNote: "Unpicked players only",
    },
  ];

  const { data: logData, error: logError } = await supabase
    .from("scheduled_email_log")
    .select(
      "id, email_type, status, event_id, recipients_count, failed_count, message, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (logError) {
    console.error("Scheduled email log loading error:", logError);
  }

  const logRows = (logData ?? []) as LogRow[];

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-neutral-400 transition hover:text-orange-500"
        >
          ← Back to admin dashboard
        </Link>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
            Race Control
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase sm:text-6xl">
            Scheduled Emails
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-neutral-400">
            When each reminder is next due, whether it will actually send
            based on the currently open round, and a log of recent sends.
          </p>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {scheduledReminders.map((reminder) => {
            const nextRun = nextBrisbaneOccurrence(
              reminder.weekday,
              reminder.hour,
              reminder.minute
            );

            let willSend: "unknown" | "yes" | "no" = "unknown";
            let previewNote = "No event currently open.";

            if (currentEvent && daysUntilRace !== null) {
              if (daysUntilRace > reminder.thresholdDays) {
                willSend = "no";
                previewNote = `Race is ${Math.round(
                  daysUntilRace
                )} days away — will skip.`;
              } else {
                willSend = "yes";
                previewNote = `Race is ${Math.round(
                  daysUntilRace
                )} days away — will send.`;
              }
            }

            return (
              <div
                key={reminder.key}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
              >
                <h2 className="text-lg font-black">{reminder.label}</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  {reminder.description}
                </p>

                <div className="mt-4 rounded-xl border border-neutral-800 bg-black p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Next Scheduled Run
                  </p>
                  <p className="mt-1 text-sm font-bold text-orange-400">
                    {formatBrisbane(nextRun)}
                  </p>
                </div>

                <div
                  className={`mt-3 rounded-xl border p-4 text-sm ${
                    willSend === "yes"
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : willSend === "no"
                        ? "border-neutral-800 bg-black text-neutral-500"
                        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  }`}
                >
                  {previewNote}
                </div>

                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  {reminder.audienceNote}
                </p>
              </div>
            );
          })}
        </section>

        {currentEvent && (
          <p className="mt-4 text-xs text-neutral-600">
            Preview based on the currently open round:{" "}
            {currentEvent.season} {currentEvent.series} · Round{" "}
            {currentEvent.round_number} · {currentEvent.venue}
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-black uppercase text-neutral-400">
            Admin Digest
          </h2>

          <div className="mt-4 max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-black">New Player Digest</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Sent to you only — a daily summary of new signups.
            </p>

            <div className="mt-4 rounded-xl border border-neutral-800 bg-black p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Next Scheduled Run
              </p>
              <p className="mt-1 text-sm font-bold text-orange-400">
                {formatBrisbane(nextBrisbaneDailyOccurrence(8, 0))}
              </p>
            </div>

            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
              Skips automatically if nobody signed up in the last 24
              hours
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black uppercase">Recent Sends</h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
            {logRows.length === 0 ? (
              <div className="p-10 text-center">
                <h3 className="text-xl font-bold">No log entries yet</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Entries will appear here the next time a scheduled
                  email job runs.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {logRows.map((row) => (
                  <article key={row.id} className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-black">
                          {formatEmailType(row.email_type)}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeStyle(
                            row.status
                          )}`}
                        >
                          {row.status.replace("_", " ")}
                        </span>
                      </div>

                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                        {formatLogDateTime(row.created_at)}
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-neutral-400">
                      {row.message}
                    </p>

                    {(row.recipients_count !== null ||
                      row.failed_count !== null) && (
                      <div className="mt-2 flex gap-5 text-xs text-neutral-500">
                        {row.recipients_count !== null && (
                          <span>Sent: {row.recipients_count}</span>
                        )}
                        {row.failed_count !== null && row.failed_count > 0 && (
                          <span className="text-red-400">
                            Failed: {row.failed_count}
                          </span>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}