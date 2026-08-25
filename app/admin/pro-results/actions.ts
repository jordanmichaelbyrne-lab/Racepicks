"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import * as cheerio from "cheerio";

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

  return { supabase, userId: user.id, userEmail: user.email ?? null };
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    adminUserId: string;
    adminEmail: string | null;
    actionType:
      | "event_format_set"
      | "results_imported_url"
      | "results_imported_manual"
      | "holeshot_set"
      | "scores_calculated";
    eventId: string;
    details?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("pro_audit_log").insert({
    admin_user_id: params.adminUserId,
    admin_email: params.adminEmail,
    action_type: params.actionType,
    event_id: params.eventId,
    details: params.details ?? null,
  });

  // Never let audit logging failure block the actual action — log the
  // logging failure to console and move on.
  if (error) {
    console.error("Audit log insert failed:", error);
  }
}

export async function setEventFormat(formData: FormData) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "").trim();
  const season = String(formData.get("season") ?? "2027");

  if (!eventId || !eventType) {
    throw new Error("Event and format are required.");
  }

  const { data: previous } = await supabase
    .from("pro_event_config")
    .select("event_type")
    .eq("event_id", eventId)
    .maybeSingle();

  const { error } = await supabase.from("pro_event_config").upsert(
    {
      event_id: eventId,
      event_type: eventType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  await logAudit(supabase, {
    adminUserId: userId,
    adminEmail: userEmail,
    actionType: "event_format_set",
    eventId,
    details: { previous_format: previous?.event_type ?? null, new_format: eventType },
  });

  revalidatePath("/admin/pro-results");
  redirect(`/admin/pro-results?event=${eventId}&season=${season}`);
}

function parseResultsPaste(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: { position: number; name: string; holeshot: boolean }[] = [];

  for (const line of lines) {
    const holeshot = line.includes("*");
    const cleanLine = line.replace(/\*/g, "").trim();

    const match = cleanLine.match(/^(\d+)[.)\s,]+(.+)$/);
    if (!match) continue;

    const position = Number.parseInt(match[1], 10);
    const name = match[2].trim();

    if (Number.isFinite(position) && name) {
      parsed.push({ position, name, holeshot });
    }
  }

  return parsed;
}

export async function importRaceResultSlotFromUrl(formData: FormData) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const resultSlot = String(formData.get("result_slot") ?? "").trim();
  const season = Number.parseInt(String(formData.get("season") ?? ""), 10);
  const sourceUrl = String(formData.get("source_url") ?? "").trim();

  if (!eventId || !resultSlot || !sourceUrl) {
    throw new Error("Event, result slot, and URL are required.");
  }

  let html: string;
  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (RacepicksBot)" },
    });
    if (!response.ok) {
      throw new Error(`Racer X returned ${response.status}`);
    }
    html = await response.text();
  } catch (err) {
    throw new Error(
      `Couldn't fetch that URL: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  const $ = cheerio.load(html);
  const parsedResults: { position: number; name: string }[] = [];

  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;

    const positionText = $(cells[0]).text().trim();
    const position = Number.parseInt(positionText, 10);
    const name = $(cells[1]).text().trim();

    if (Number.isFinite(position) && name) {
      parsedResults.push({ position, name });
    }
  });

  if (parsedResults.length === 0) {
    throw new Error(
      "No results table found at that URL. Check the link is a Racer X results page."
    );
  }

  const { data: riders, error: ridersError } = await supabase
    .from("riders")
    .select("id, full_name")
    .eq("pro_eligible", true)
    .eq("is_active", true);

  if (ridersError) {
    throw new Error(ridersError.message);
  }

  const riderByLowerName = new Map(
    (riders ?? []).map((r) => [r.full_name.toLowerCase().trim(), r.id])
  );

  const unmatched: string[] = [];
  const rows: {
    event_id: string;
    result_slot: string;
    rider_id: string;
    finishing_position: number;
    status: string;
    had_holeshot: boolean;
    updated_at: string;
  }[] = [];

  const { data: existingHoleshot } = await supabase
    .from("pro_race_results")
    .select("rider_id")
    .eq("event_id", eventId)
    .eq("result_slot", resultSlot)
    .eq("had_holeshot", true)
    .maybeSingle();

  const holeshotRiderId = existingHoleshot?.rider_id ?? null;

  for (const entry of parsedResults) {
    const riderId = riderByLowerName.get(entry.name.toLowerCase().trim());

    if (!riderId) {
      unmatched.push(`${entry.position}. ${entry.name}`);
      continue;
    }

    rows.push({
      event_id: eventId,
      result_slot: resultSlot,
      rider_id: riderId,
      finishing_position: entry.position,
      status: "classified",
      had_holeshot: riderId === holeshotRiderId,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("pro_race_results")
      .upsert(rows, { onConflict: "event_id,result_slot,rider_id" });

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  await logAudit(supabase, {
    adminUserId: userId,
    adminEmail: userEmail,
    actionType: "results_imported_url",
    eventId,
    details: {
      result_slot: resultSlot,
      source_url: sourceUrl,
      matched_count: rows.length,
      unmatched,
    },
  });

  revalidatePath("/admin/pro-results");

  const unmatchedParam =
    unmatched.length > 0
      ? `&unmatched=${encodeURIComponent(unmatched.join(" | "))}`
      : "";

  redirect(
    `/admin/pro-results?event=${eventId}&season=${season}&saved=${resultSlot}&matched=${rows.length}${unmatchedParam}`
  );
}

export async function setHoleshotWinner(formData: FormData) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const resultSlot = String(formData.get("result_slot") ?? "").trim();
  const season = String(formData.get("season") ?? "2027");
  const riderId = String(formData.get("rider_id") ?? "").trim();

  if (!eventId || !resultSlot || !riderId) {
    throw new Error("Event, slot, and rider are required.");
  }

  const { data: riderInfo } = await supabase
    .from("riders")
    .select("full_name")
    .eq("id", riderId)
    .maybeSingle();

  const { error: clearError } = await supabase
    .from("pro_race_results")
    .update({ had_holeshot: false })
    .eq("event_id", eventId)
    .eq("result_slot", resultSlot);

  if (clearError) {
    throw new Error(clearError.message);
  }

  const { error: setError } = await supabase
    .from("pro_race_results")
    .update({ had_holeshot: true })
    .eq("event_id", eventId)
    .eq("result_slot", resultSlot)
    .eq("rider_id", riderId);

  if (setError) {
    throw new Error(setError.message);
  }

  await logAudit(supabase, {
    adminUserId: userId,
    adminEmail: userEmail,
    actionType: "holeshot_set",
    eventId,
    details: { result_slot: resultSlot, rider_id: riderId, rider_name: riderInfo?.full_name ?? null },
  });

  revalidatePath("/admin/pro-results");
  redirect(`/admin/pro-results?event=${eventId}&season=${season}&holeshotSet=${resultSlot}`);
}

export async function saveRaceResultSlot(formData: FormData) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const resultSlot = String(formData.get("result_slot") ?? "").trim();
  const season = Number.parseInt(String(formData.get("season") ?? ""), 10);
  const pasteText = String(formData.get("paste_text") ?? "");

  if (!eventId || !resultSlot) {
    throw new Error("Event and result slot are required.");
  }

  const parsedResults = parseResultsPaste(pasteText);

  if (parsedResults.length === 0) {
    throw new Error(
      "No results could be parsed. Expected lines like: 1. Jett Lawrence"
    );
  }

  const { data: riders, error: ridersError } = await supabase
    .from("riders")
    .select("id, full_name")
    .eq("pro_eligible", true)
    .eq("is_active", true);

  if (ridersError) {
    throw new Error(ridersError.message);
  }

  const riderByLowerName = new Map(
    (riders ?? []).map((r) => [r.full_name.toLowerCase().trim(), r.id])
  );

  const unmatched: string[] = [];
  const rows: {
    event_id: string;
    result_slot: string;
    rider_id: string;
    finishing_position: number;
    status: string;
    had_holeshot: boolean;
    updated_at: string;
  }[] = [];

  for (const entry of parsedResults) {
    const riderId = riderByLowerName.get(entry.name.toLowerCase().trim());

    if (!riderId) {
      unmatched.push(`${entry.position}. ${entry.name}`);
      continue;
    }

    rows.push({
      event_id: eventId,
      result_slot: resultSlot,
      rider_id: riderId,
      finishing_position: entry.position,
      status: "classified",
      had_holeshot: entry.holeshot,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("pro_race_results")
      .upsert(rows, { onConflict: "event_id,result_slot,rider_id" });

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  await logAudit(supabase, {
    adminUserId: userId,
    adminEmail: userEmail,
    actionType: "results_imported_manual",
    eventId,
    details: { result_slot: resultSlot, matched_count: rows.length, unmatched },
  });

  revalidatePath("/admin/pro-results");

  const unmatchedParam =
    unmatched.length > 0
      ? `&unmatched=${encodeURIComponent(unmatched.join(" | "))}`
      : "";

  redirect(
    `/admin/pro-results?event=${eventId}&season=${season}&saved=${resultSlot}&matched=${rows.length}${unmatchedParam}`
  );
}