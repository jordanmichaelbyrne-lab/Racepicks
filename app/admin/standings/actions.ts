"use server";

import * as cheerio from "cheerio";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

type ImportedStanding = {
  season: number;
  series: string;
  class_name: string;
  position: number;
  rider_name: string;
  race_number: number | null;
  manufacturer: string | null;
  points: number;
  source_url: string;
  updated_at: string;
};

type DatabaseRider = {
  id: string;
  full_name: string;
  race_number: number | null;
  manufacturer: string | null;
};

function normaliseText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normaliseRiderName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingRider(
  importedName: string,
  riders: DatabaseRider[]
) {
  const normalisedImportedName =
    normaliseRiderName(importedName);

  const exactMatch = riders.find(
    (rider) =>
      normaliseRiderName(rider.full_name) ===
      normalisedImportedName
  );

  if (exactMatch) {
    return exactMatch;
  }

  const importedParts = normalisedImportedName.split(" ");
  const importedFirstName = importedParts[0] ?? "";
  const importedLastName =
    importedParts[importedParts.length - 1] ?? "";

  const firstAndLastMatch = riders.find((rider) => {
    const riderParts = normaliseRiderName(
      rider.full_name
    ).split(" ");

    const riderFirstName = riderParts[0] ?? "";
    const riderLastName =
      riderParts[riderParts.length - 1] ?? "";

    return (
      riderFirstName === importedFirstName &&
      riderLastName === importedLastName
    );
  });

  if (firstAndLastMatch) {
    return firstAndLastMatch;
  }

  const lastNameMatches = riders.filter((rider) => {
    const riderParts = normaliseRiderName(
      rider.full_name
    ).split(" ");

    const riderLastName =
      riderParts[riderParts.length - 1] ?? "";

    return riderLastName === importedLastName;
  });

  if (lastNameMatches.length === 1) {
    return lastNameMatches[0];
  }

  return null;
}

function detectSeriesFromUrl(url: URL) {
  const pathParts = url.pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.toLowerCase());

  const seriesCode = pathParts[0];

  if (seriesCode === "mx") {
    return "Motocross";
  }

  if (seriesCode === "sx") {
    return "Supercross";
  }

  if (seriesCode === "smx") {
    return "SMX";
  }

  throw new Error(
    "The Racer X URL must be a Motocross, Supercross or SMX standings page."
  );
}

function detectSeasonFromUrl(url: URL) {
  const pathParts = url.pathname
    .split("/")
    .filter(Boolean);

  const seasonValue = pathParts[1];
  const season = Number(seasonValue);

  if (
    !Number.isInteger(season) ||
    season < 2000 ||
    season > 2100
  ) {
    throw new Error(
      "The season could not be detected from the Racer X URL."
    );
  }

  return season;
}

function validateRacerXUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(
      "Enter a valid Racer X standings URL."
    );
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname !== "racerxonline.com" &&
    hostname !== "www.racerxonline.com"
  ) {
    throw new Error(
      "The standings importer currently accepts Racer X URLs only."
    );
  }

  const pathParts = url.pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.toLowerCase());

  const validSeries = ["mx", "sx", "smx"];

  if (
    pathParts.length < 4 ||
    !validSeries.includes(pathParts[0]) ||
    pathParts[2] !== "points" ||
    pathParts[3] !== "450"
  ) {
    throw new Error(
      "Use a Racer X 450 standings URL such as /mx/2026/points/450."
    );
  }

  return url;
}

function parseStandingsHtml(
  html: string,
  season: number,
  series: string,
  sourceUrl: string
) {
  const $ = cheerio.load(html);
  const standings: ImportedStanding[] = [];
  const seenPositions = new Set<number>();
  const importedAt = new Date().toISOString();

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("th, td")
      .map((__, cell) =>
        normaliseText($(cell).text())
      )
      .get()
      .filter(Boolean);

    if (cells.length < 3) {
      return;
    }

    const position = Number(
      cells[0].replace(/[^\d]/g, "")
    );

    if (
      !Number.isInteger(position) ||
      position < 1 ||
      seenPositions.has(position)
    ) {
      return;
    }

    const pointsCell = cells[cells.length - 1];

    const points = Number(
      pointsCell.replace(/[^\d]/g, "")
    );

    if (
      !Number.isInteger(points) ||
      points < 0
    ) {
      return;
    }

    const rowElement = $(row);

    const riderLink = rowElement
      .find('a[href*="/rider/"]')
      .first();

    let riderName = normaliseText(
      riderLink.text()
    );

    if (!riderName) {
      const possibleNames = cells
        .slice(1, -1)
        .filter((cell) => {
          const lowerCaseCell =
            cell.toLowerCase();

          return (
            /[a-zA-Z]/.test(cell) &&
            !lowerCaseCell.includes("hometown") &&
            !lowerCaseCell.includes("points")
          );
        });

      riderName = possibleNames[0] ?? "";
    }

    if (
      !riderName ||
      riderName.length < 3
    ) {
      return;
    }

    seenPositions.add(position);

    standings.push({
      season,
      series,
      class_name: "450",
      position,
      rider_name: riderName,
      race_number: null,
      manufacturer: null,
      points,
      source_url: sourceUrl,
      updated_at: importedAt,
    });
  });

  /*
   * Racer X may render the standings without a normal HTML table.
   * This fallback reads the visible standings rows from the page text.
   */
  if (standings.length === 0) {
    const bodyText = $("body")
      .text()
      .replace(/\r/g, "")
      .split("\n")
      .map(normaliseText)
      .filter(Boolean);

    const headingIndex = bodyText.findIndex(
      (line) =>
        line
          .toLowerCase()
          .includes("450 points standings")
    );

    const relevantLines =
      headingIndex >= 0
        ? bodyText.slice(headingIndex + 1)
        : bodyText;

    for (const line of relevantLines) {
      const match = line.match(
        /^(\d{1,3})\s+(.+?)\s+(\d{1,4})$/
      );

      if (!match) {
        continue;
      }

      const position = Number(match[1]);
      const middleText = normaliseText(match[2]);
      const points = Number(match[3]);

      if (
        !Number.isInteger(position) ||
        !Number.isInteger(points) ||
        position < 1 ||
        points < 0 ||
        seenPositions.has(position)
      ) {
        continue;
      }

      const riderNameMatch = middleText.match(
        /^([A-Za-zÀ-ÿ.'’\-]+(?:\s+[A-Za-zÀ-ÿ.'’\-]+){1,4})/
      );

      const riderName = normaliseText(
        riderNameMatch?.[1] ?? ""
      );

      if (!riderName) {
        continue;
      }

      seenPositions.add(position);

      standings.push({
        season,
        series,
        class_name: "450",
        position,
        rider_name: riderName,
        race_number: null,
        manufacturer: null,
        points,
        source_url: sourceUrl,
        updated_at: importedAt,
      });
    }
  }

  return standings.sort(
    (first, second) =>
      first.position - second.position
  );
}

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/");
  }

  return supabase;
}

export async function importChampionshipStandings(
  formData: FormData
) {
  const supabase = await requireAdmin();

  const rawUrl = String(
    formData.get("source_url") ?? ""
  ).trim();

  let url: URL;
  let season: number;
  let series: string;

  try {
    url = validateRacerXUrl(rawUrl);
    season = detectSeasonFromUrl(url);
    series = detectSeriesFromUrl(url);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The standings URL is invalid.";

    redirect(
      `/admin/standings?error=${encodeURIComponent(
        message
      )}`
    );
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Racepicks/1.0; +https://racepicks.app)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });
  } catch {
    redirect(
      `/admin/standings?error=${encodeURIComponent(
        "Racepicks could not connect to Racer X."
      )}`
    );
  }

  if (!response.ok) {
    redirect(
      `/admin/standings?error=${encodeURIComponent(
        `Racer X returned HTTP ${response.status}.`
      )}`
    );
  }

  const html = await response.text();

  const parsedStandings = parseStandingsHtml(
    html,
    season,
    series,
    url.toString()
  );

  if (parsedStandings.length < 5) {
    redirect(
      `/admin/standings?error=${encodeURIComponent(
        "Racepicks could not detect enough 450 standings rows on that page."
      )}`
    );
  }

  const {
    data: riderData,
    error: riderError,
  } = await supabase
    .from("riders")
    .select(
      `
        id,
        full_name,
        race_number,
        manufacturer
      `
    );

  if (riderError) {
    redirect(
      `/admin/standings?error=${encodeURIComponent(
        riderError.message
      )}`
    );
  }

  const riders =
    (riderData ?? []) as DatabaseRider[];

  const standings = parsedStandings.map(
    (standing) => {
      const matchedRider = findMatchingRider(
        standing.rider_name,
        riders
      );

      return {
        ...standing,
        race_number:
          matchedRider?.race_number ?? null,
        manufacturer:
          matchedRider?.manufacturer ?? null,
      };
    }
  );

  const { error: deleteError } =
    await supabase
      .from("championship_standings")
      .delete()
      .eq("season", season)
      .eq("series", series)
      .eq("class_name", "450");

  if (deleteError) {
    redirect(
      `/admin/standings?error=${encodeURIComponent(
        deleteError.message
      )}`
    );
  }

  const { error: insertError } =
    await supabase
      .from("championship_standings")
      .insert(standings);

  if (insertError) {
    redirect(
      `/admin/standings?error=${encodeURIComponent(
        insertError.message
      )}`
    );
  }

  const matchedRiderCount =
    standings.filter(
      (standing) =>
        standing.manufacturer !== null ||
        standing.race_number !== null
    ).length;

  revalidatePath("/admin");
  revalidatePath("/admin/standings");
  revalidatePath("/results");

  redirect(
    `/admin/standings?success=true&count=${
      standings.length
    }&matched=${matchedRiderCount}&season=${season}&series=${encodeURIComponent(
      series
    )}`
  );
}