import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

type CoreLogRow = {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action_type: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type ProLogRow = {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action_type: string;
  event_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type UnifiedEntry = {
  id: string;
  source: "Core" | "Pro";
  adminEmail: string | null;
  actionType: string;
  target: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    source?: string;
  }>;
};

const FETCH_LIMIT = 150;
const DISPLAY_LIMIT = 100;

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date));
}

function formatActionType(actionType: string) {
  return actionType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getActionBadgeStyle(actionType: string) {
  if (actionType.includes("delete") || actionType.includes("disabled")) {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  if (actionType.includes("published") || actionType.includes("added") || actionType.includes("enabled")) {
    return "border-green-500/30 bg-green-500/10 text-green-400";
  }

  if (actionType.includes("updated") || actionType.includes("recalculated")) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-400";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

export default async function AdminAuditLogPage({ searchParams }: PageProps) {
  const params = await searchParams;
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

  const [coreLogResponse, proLogResponse] = await Promise.all([
    supabase
      .from("admin_audit_log")
      .select(
        "id, admin_user_id, admin_email, action_type, target_table, target_id, details, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT),

    supabase
      .from("pro_audit_log")
      .select(
        "id, admin_user_id, admin_email, action_type, event_id, details, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT),
  ]);

  if (coreLogResponse.error) {
    console.error("Core audit log loading error:", coreLogResponse.error);
  }

  if (proLogResponse.error) {
    console.error("Pro audit log loading error:", proLogResponse.error);
  }

  const coreRows = (coreLogResponse.data ?? []) as CoreLogRow[];
  const proRows = (proLogResponse.data ?? []) as ProLogRow[];

  const unified: UnifiedEntry[] = [
    ...coreRows.map((row) => ({
      id: `core-${row.id}`,
      source: "Core" as const,
      adminEmail: row.admin_email,
      actionType: row.action_type,
      target:
        row.target_table && row.target_id
          ? `${row.target_table}: ${row.target_id}`
          : row.target_table ?? row.target_id ?? null,
      details: row.details,
      createdAt: row.created_at,
    })),
    ...proRows.map((row) => ({
      id: `pro-${row.id}`,
      source: "Pro" as const,
      adminEmail: row.admin_email,
      actionType: row.action_type,
      target: row.event_id ? `events: ${row.event_id}` : null,
      details: row.details,
      createdAt: row.created_at,
    })),
  ].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );

  const sourceFilter = params.source && ["Core", "Pro"].includes(params.source)
    ? (params.source as "Core" | "Pro")
    : null;

  const query = (params.q ?? "").trim().toLowerCase();

  const filtered = unified.filter((entry) => {
    if (sourceFilter && entry.source !== sourceFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchableText = [
      entry.actionType,
      entry.adminEmail,
      entry.target,
      entry.source,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  const displayed = filtered.slice(0, DISPLAY_LIMIT);

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
            Audit Log
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-neutral-400">
            Every admin action, who did it, and when — combining the core
            game and Racepicks Pro. Showing the most recent{" "}
            {DISPLAY_LIMIT} entries.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <form method="get" className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label
                htmlFor="q"
                className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
              >
                Search
              </label>

              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params.q ?? ""}
                placeholder="Action, admin email, or target…"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="source"
                className="text-xs font-semibold uppercase tracking-widest text-neutral-400"
              >
                Source
              </label>

              <select
                id="source"
                name="source"
                defaultValue={params.source ?? ""}
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500 sm:w-40"
              >
                <option value="">All</option>
                <option value="Core">Core</option>
                <option value="Pro">Pro</option>
              </select>
            </div>

            <button
              type="submit"
              className="self-end rounded-xl border border-orange-500 px-6 py-3 font-bold text-orange-500 transition hover:bg-orange-500 hover:text-black"
            >
              Filter
            </button>

            {(params.q || params.source) && (
              <Link
                href="/admin/audit-log"
                className="self-end rounded-xl border border-neutral-700 px-6 py-3 text-center font-bold text-neutral-400 transition hover:border-neutral-500"
              >
                Clear
              </Link>
            )}
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
          {displayed.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-xl font-bold">No matching entries</h3>
              <p className="mt-2 text-sm text-neutral-400">
                {unified.length === 0
                  ? "No admin actions have been logged yet."
                  : "Try a different search or clear the filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {displayed.map((entry) => (
                <article key={entry.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${getActionBadgeStyle(
                          entry.actionType
                        )}`}
                      >
                        {formatActionType(entry.actionType)}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          entry.source === "Pro"
                            ? "bg-orange-500/15 text-orange-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {entry.source}
                      </span>
                    </div>

                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-400">
                    <p>
                      <span className="text-neutral-600">By:</span>{" "}
                      {entry.adminEmail ?? "Unknown"}
                    </p>

                    {entry.target && (
                      <p>
                        <span className="text-neutral-600">Target:</span>{" "}
                        {entry.target}
                      </p>
                    )}
                  </div>

                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <pre className="mt-3 overflow-x-auto rounded-xl border border-neutral-800 bg-black p-4 text-xs leading-5 text-neutral-400">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {filtered.length > DISPLAY_LIMIT && (
          <p className="mt-4 text-center text-sm text-neutral-500">
            Showing the {DISPLAY_LIMIT} most recent of {filtered.length}{" "}
            matching entries. Narrow your search to see more specific
            results.
          </p>
        )}
      </div>
    </main>
  );
}