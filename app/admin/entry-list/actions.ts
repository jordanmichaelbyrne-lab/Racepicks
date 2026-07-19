"use server";

import * as cheerio from "cheerio";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { notifyPlayersOfWithdrawnRiders } from "@/app/lib/notifications";

type ImportedRider = {
  fullName: string;
  raceNumber: number;
  manufacturer: string | null;
};

type PublicationStage = "provisional" | "final";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

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

function revalidateEntryListPages() {
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/entry-list");
  revalidatePath("/admin/results");
  revalidatePath("/admin/riders");
  revalidatePath("/picks");
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

  const importedAt = new Date().toISOString();

  const riderRows = importedRiders.map((rider) => ({
    full_name: rider.fullName,
    race_number: rider.raceNumber,
    manufacturer: rider.manufacturer,
    class_name: "450",
    is_active: true,
    updated_at: importedAt,
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

  const { data: previousEntries, error: previousEntriesError } =
    await supabase
      .from("event_entries")
      .select("rider_id")
      .eq("event_id", eventId)
      .eq("confirmed", true);

  if (previousEntriesError) {
    console.error(
      "Could not load previous entry list:",
      previousEntriesError
    );
  }

  const previousConfirmedRiderIds = (previousEntries ?? []).map(
    (entry) => entry.rider_id
  );

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
  await notifyPlayersOfWithdrawnRiders(
    supabase,
    eventId,
    previousConfirmedRiderIds,
    savedRiders.map((rider) => rider.id)
  );

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("entry_list_stage")
    .eq("id", eventId)
    .single();

  if (eventError) {
    throw new Error(eventError.message);
  }

  const alreadyFinal = event.entry_list_stage === "final";

  const eventUpdate = alreadyFinal
    ? {
        entry_list_url: entryListUrl,
        entry_list_imported_at: importedAt,
      }
    : {
        entry_list_url: entryListUrl,
        entry_list_imported_at: importedAt,
        provisional_entry_imported_at: importedAt,
        entry_list_stage: "provisional",
      };

  const { error: eventUpdateError } = await supabase
    .from("events")
    .update(eventUpdate)
    .eq("id", eventId);

  if (eventUpdateError) {
    console.error(
      "Entry-list event update error:",
      eventUpdateError
    );

    throw new Error(eventUpdateError.message);
  }

  revalidateEntryListPages();

  redirect(
    `/admin/entry-list?event=${eventId}&imported=${savedRiders.length}&stage=${
      alreadyFinal ? "final" : "provisional"
    }`
  );
}

export async function saveEventEntries(formData: FormData) {
  const supabase = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();

  const requestedStage = String(
    formData.get("publication_stage") ?? ""
  ).trim() as PublicationStage;

  const riderIds = formData
    .getAll("rider_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!eventId) {
    throw new Error("Event ID is missing.");
  }

  if (
    requestedStage !== "provisional" &&
    requestedStage !== "final"
  ) {
    throw new Error("Choose whether this is a provisional or final list.");
  }

  if (riderIds.length === 0) {
    throw new Error(
      "Select at least one rider before publishing the entry list."
    );
  }

  const { data: previousEntries, error: previousEntriesError } =
    await supabase
      .from("event_entries")
      .select("rider_id")
      .eq("event_id", eventId)
      .eq("confirmed", true);

  if (previousEntriesError) {
    console.error(
      "Could not load previous entry list:",
      previousEntriesError
    );
  }

  const previousConfirmedRiderIds = (previousEntries ?? []).map(
    (entry) => entry.rider_id
  );

  const { error: deleteError } = await supabase
    .from("event_entries")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    console.error("Clear entry list error:", deleteError);
    throw new Error(deleteError.message);
  }

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
  
  await notifyPlayersOfWithdrawnRiders(
    supabase,
    eventId,
    previousConfirmedRiderIds,
    riderIds
  );

  const updatedAt = new Date().toISOString();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("entry_list_stage")
    .eq("id", eventId)
    .single();

  if (eventError) {
    throw new Error(eventError.message);
  }

  const alreadyFinal = event.entry_list_stage === "final";

  if (alreadyFinal && requestedStage === "provisional") {
    revalidateEntryListPages();

    redirect(
      `/admin/entry-list?event=${eventId}&saved=true&stage=final`
    );
  }

  const eventUpdate =
    requestedStage === "final"
      ? {
          entry_list_stage: "final",
          final_entry_imported_at: updatedAt,
          entry_list_imported_at: updatedAt,
        }
      : {
          entry_list_stage: "provisional",
          provisional_entry_imported_at: updatedAt,
          entry_list_imported_at: updatedAt,
        };

  const { error: updateEventError } = await supabase
    .from("events")
    .update(eventUpdate)
    .eq("id", eventId);

  if (updateEventError) {
    console.error("Entry-list event status error:", updateEventError);
    throw new Error(updateEventError.message);
  }

  revalidateEntryListPages();

  redirect(
    `/admin/entry-list?event=${eventId}&saved=true&stage=${requestedStage}`
  );
}