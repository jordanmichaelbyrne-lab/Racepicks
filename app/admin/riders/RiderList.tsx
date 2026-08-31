"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toggleRiderStatus } from "./actions";

type Rider = {
  id: string;
  full_name: string;
  race_number: number | null;
  team_name: string | null;
  manufacturer: string | null;
  nationality: string | null;
  class_name: string;
  racerx_slug: string | null;
  image_url: string | null;
  is_active: boolean;
};

export default function RiderList({ riders }: { riders: Rider[] }) {
  const [search, setSearch] = useState("");

  const filteredRiders = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return riders;
    }

    return riders.filter((rider) => {
      const searchableText = [
        rider.full_name,
        rider.race_number,
        rider.team_name,
        rider.manufacturer,
        rider.nationality,
        rider.class_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [riders, search]);

  return (
    <>
      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, number, team, manufacturer…"
          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none transition focus:border-orange-500"
        />

        {search && (
          <p className="mt-2 text-xs text-neutral-500">
            {filteredRiders.length} of {riders.length} riders match
            &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {filteredRiders.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-10 text-center">
          <h3 className="text-xl font-bold">No riders match your search</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Try a different name, number, or team.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRiders.map((rider) => (
            <article
              key={rider.id}
              className={`flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
                rider.is_active
                  ? "border-neutral-800 bg-neutral-950"
                  : "border-neutral-900 bg-neutral-950/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                {rider.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rider.image_url}
                    alt={rider.full_name}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 min-w-16 items-center justify-center rounded-xl bg-orange-500 px-3 text-xl font-black text-black">
                    #{rider.race_number ?? "—"}
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black">{rider.full_name}</h3>

                    <span className="rounded-full bg-neutral-800 px-2 py-1 text-[10px] font-bold uppercase text-neutral-400">
                      {rider.class_name}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-neutral-400">
                    {rider.manufacturer || "Unknown manufacturer"}
                    {rider.team_name ? ` · ${rider.team_name}` : ""}
                  </p>

                  {rider.nationality && (
                    <p className="mt-1 text-xs text-neutral-600">
                      {rider.nationality}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    rider.is_active
                      ? "bg-green-950 text-green-400"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {rider.is_active ? "Active" : "Disabled"}
                </span>

                <Link
                  href={`/admin/riders/${rider.id}`}
                  className="rounded-xl border border-orange-500 px-4 py-2 text-sm font-bold text-orange-500 transition hover:bg-orange-500 hover:text-black"
                >
                  Edit
                </Link>

                <form action={toggleRiderStatus}>
                  <input type="hidden" name="rider_id" value={rider.id} />

                  <input
                    type="hidden"
                    name="current_status"
                    value={String(rider.is_active)}
                  />

                  <button
                    type="submit"
                    className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-bold transition hover:border-orange-500 hover:text-orange-500"
                  >
                    {rider.is_active ? "Disable" : "Enable"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}