import "server-only";

import { readFileSync } from "node:fs";
import { z } from "zod";

import { MARKET_CSV, PHYSICIAN_ID_PATTERN } from "./paths";
import type { MarketRow } from "../types";

/**
 * Market intelligence loader (SPEC.md 6.1).
 *
 * The CSV owns physician identity, organization, and opportunity size. It owns
 * nothing about product fit, CRM state, or testing volume, and the schema below
 * rejects any column that would smuggle those in.
 */

const EXPECTED_HEADER = [
  "physician_id",
  "oncologist_name",
  "provider_org",
  "likely_patient_population",
] as const;

const marketRowSchema = z.object({
  physician_id: z.string().regex(PHYSICIAN_ID_PATTERN, "physician_id must look like p01"),
  oncologist_name: z.string().min(1),
  provider_org: z.string().min(1),
  likely_patient_population: z.coerce.number().int().positive(),
});

/** Splits one CSV line, honoring double-quoted fields that contain commas. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // A doubled quote inside a quoted field is a literal quote.
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);

  return cells.map((cell) => cell.trim());
}

let cached: MarketRow[] | null = null;

export function loadMarketRows(): MarketRow[] {
  if (cached) return cached;

  const raw = readFileSync(MARKET_CSV, "utf8").replace(/\r\n/g, "\n").trim();
  const lines = raw.split("\n").filter((line) => line.trim() !== "");

  const header = splitCsvLine(lines[0] ?? "");
  if (header.join(",") !== EXPECTED_HEADER.join(",")) {
    throw new Error(
      `Market CSV header drifted from the spec contract.\n  expected: ${EXPECTED_HEADER.join(", ")}\n  found:    ${header.join(", ")}`,
    );
  }

  const seen = new Set<string>();
  const rows = lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const record = Object.fromEntries(EXPECTED_HEADER.map((key, i) => [key, cells[i] ?? ""]));

    const parsed = marketRowSchema.safeParse(record);
    if (!parsed.success) {
      throw new Error(`Market CSV row ${index + 2} is invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }

    if (seen.has(parsed.data.physician_id)) {
      throw new Error(`Market CSV has a duplicate physician_id: ${parsed.data.physician_id}`);
    }
    seen.add(parsed.data.physician_id);

    return {
      physicianId: parsed.data.physician_id,
      oncologistName: parsed.data.oncologist_name,
      providerOrg: parsed.data.provider_org,
      likelyPatientPopulation: parsed.data.likely_patient_population,
    } satisfies MarketRow;
  });

  cached = rows;
  return rows;
}

/** Returns the row for a physician, or null when the ID is unknown. */
export function findMarketRow(physicianId: string): MarketRow | null {
  return loadMarketRows().find((row) => row.physicianId === physicianId) ?? null;
}
