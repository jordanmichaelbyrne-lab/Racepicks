"use server";

import * as cheerio from "cheerio";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

type ImportedRider = {
  fullName: string;
  raceNumber: number;
  manufacturer: string | null;
};

async function requireAdmin() {
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

  return supabase;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function identifyManufacturer(bikeName: string) {
  const bike = bikeName.toLowerCase();

  if (bike.includes("honda")) return "Honda";
  if (bike.includes("yamaha")) return "Yamaha";
  if (bike.includes("kawasaki")) return "Kawasaki";
  if (bike.includes("husqvarna")) return "Husqvarna";
  if (bike.includes("gasgas")) return "GasGas";
  if (bike.includes("suzuki")) return "Suzuki";
  if (bike.includes("triumph")) return "Triumph";
  if (bike.includes("ducati")) return "Ducati";
  if (bike.includes("beta")) return "Beta";
  if (bike.includes("ktm")) return "KTM";

  return bikeName ? bikeName : null;
}

function normaliseRiderName(name: string) {
  return cleanText(name)
    .replace(/\bUpdated\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRacerXEntryList(html: string): ImportedRider[] {
  const $ = cheerio.load(html);
  const importedRiders: ImportedRider[] = [];

  $("table tbody tr").each((_index, row) => {
    const cells = $(row)
      .find("td")
      .map((_cellIndex, cell) => cleanText($(cell).text()))
      .get();

    if (cells.length < 4) {
      return;
    }

    const raceNumber = Number.parseInt(cells[0], 10);
    const fullName = normaliseRiderName(cells[1]);
    const bikeName = cells[cells.length - 1];

    if (
      !Number.isInteger(raceNumber) ||
      raceNumber <= 0 ||
      !fullName
    ) {
      return;
    }

    importedRiders.push({
      raceNumber,
      fullName,
      manufacturer: identifyManufacturer(bikeName),
    });
  });

  /*
   * Fallback for minor Racer X layout changes.
   * It searches any row containing at least four table cells.
   */
  if (importedRiders.length === 0) {
    $("tr").each((_index, row) => {
      const cells = $(row)
        .find("td")
        .map((_cellIndex, cell) => cleanText($(cell).text()))
        .get();

      if (cells.length < 4) {
        return;
      }

      const raceNumber = Number.parseInt(cells[0], 10);
      const fullName = normaliseRiderName(cells[1]);
      const bikeName = cells[cells.length - 1];

      if (
        !Number.isInteger(raceNumber) ||
        raceNumber <= 0 ||
        !fullName
      ) {
        return;
      }

      importedRiders.push({
        raceNumber,
        fullName,
        manufacturer: identifyManufacturer(bikeName),
      });
    });
  }

  const uniqueRiders = new Map<string, ImportedRider>();

  for (const rider of importedRiders) {
    const key = `${rider.fullName.toLowerCase()}-450`;

    uniqueRiders.set(key, rider);
  }

  return Array.from(uniqueRiders.values());
}

export async function importRacerXEntryList(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const entryListUrl = String(
    formData.get("entry_list_url") ?? ""
  ).trim();

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(entryListUrl);
  } catch {
    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        "Please enter a valid Racer X URL."
      )}`
    );
  }

  const allowedHostnames = new Set([
    "racerxonline.com",
    "www.racerxonline.com",
  ]);

  if (!allowedHostnames.has(parsedUrl.hostname.toLowerCase())) {
    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        "Only Racer X entry-list URLs are currently supported."
      )}`
    );
  }

  if (!parsedUrl.pathname.endsWith("/entry-list")) {
    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        "The URL must point to a Racer X entry-list page."
      )}`
    );
  }

  const response = await fetch(entryListUrl, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Racepicks Entry List Importer/1.0 (+https://racepicks.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        `Racer X returned HTTP ${response.status}.`
      )}`
    );
  }

  const html = await response.text();
  const importedRiders = parseRacerXEntryList(html);

  if (importedRiders.length === 0) {
    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        "No riders were found. Racer X may have changed the page layout."
      )}`
    );
  }

  const riderRows = importedRiders.map((rider) => ({
    full_name: rider.fullName,
    race_number: rider.raceNumber,
    manufacturer: rider.manufacturer,
    class_name: "450",
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  const { data: savedRiders, error: riderError } = await supabase
    .from("riders")
    .upsert(riderRows, {
      onConflict: "full_name,class_name",
    })
    .select("id, full_name");

  if (riderError) {
    console.error("Racer X rider import error:", riderError);

    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        riderError.message
      )}`
    );
  }

  if (!savedRiders || savedRiders.length === 0) {
    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        "The riders could not be saved."
      )}`
    );
  }

  const { error: clearEntriesError } = await supabase
    .from("event_entries")
    .delete()
    .eq("event_id", eventId);

  if (clearEntriesError) {
    console.error(
      "Clear imported entry list error:",
      clearEntriesError
    );

    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        clearEntriesError.message
      )}`
    );
  }

  const eventEntries = savedRiders.map((rider) => ({
    event_id: eventId,
    rider_id: rider.id,
    confirmed: true,
  }));

  const { error: entryError } = await supabase
    .from("event_entries")
    .insert(eventEntries);

  if (entryError) {
    console.error("Imported entry-list saving error:", entryError);

    redirect(
      `/admin/entry-list?event=${eventId}&importError=${encodeURIComponent(
        entryError.message
      )}`
    );
  }

  const importedAt = new Date().toISOString();

  const { error: eventUpdateError } = await supabase
    .from("events")
    .update({
      entry_list_url: entryListUrl,
      entry_list_imported_at: importedAt,
    })
    .eq("id", eventId);

  if (eventUpdateError) {
    console.error(
      "Entry-list event update error:",
      eventUpdateError
    );
  }

  revalidatePath("/admin/entry-list");
  revalidatePath("/admin/riders");
  revalidatePath("/picks");

  redirect(
    `/admin/entry-list?event=${eventId}&imported=${savedRiders.length}`
  );
}

export async function saveEventEntries(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  const riderIds = formData
    .getAll("rider_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  const { error: deleteError } = await supabase
    .from("event_entries")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    console.error("Clear entry list error:", deleteError);
    throw new Error(deleteError.message);
  }

  if (riderIds.length > 0) {
    const entries = riderIds.map((riderId) => ({
      event_id: eventId,
      rider_id: riderId,
      confirmed: true,
    }));

    const { error: insertError } = await supabase
      .from("event_entries")
      .insert(entries);

    if (insertError) {
      console.error("Save entry list error:", insertError);
      throw new Error(insertError.message);
    }
  }

  revalidatePath("/admin/entry-list");
  revalidatePath("/picks");

  redirect(`/admin/entry-list?event=${eventId}&saved=true`);
}