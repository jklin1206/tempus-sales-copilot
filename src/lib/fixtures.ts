import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { FIXTURES_DIR, PHYSICIAN_ID_PATTERN } from "./data/paths";
import { briefSchema, type Brief } from "./brief/schema";

/**
 * Bundled demo briefs (SPEC.md 13).
 *
 * One recorded brief per physician, for ALL eight, so a reviewer with no credentials can
 * open every provider the UI can reach. Every one is real model output that passed the
 * same blocking validator the live path runs; none is hand-authored.
 *
 * These are read in ONE situation: the app is in demo mode, which happens when no model key is
 * configured, and which the UI states plainly on every screen. They are never substituted for a
 * live brief that failed. See src/lib/mode.ts for why that distinction is worth enforcing.
 *
 * There is no saved-report history here any more. Report snapshots existed to serve a
 * daily-queue narrative the data could not honestly support.
 */

const BRIEFS_DIR = join(FIXTURES_DIR, "briefs");

export function findFixtureBrief(physicianId: string): Brief | null {
  if (!PHYSICIAN_ID_PATTERN.test(physicianId)) return null;

  const path = join(BRIEFS_DIR, `${physicianId}.json`);
  if (!existsSync(path)) return null;

  return briefSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

/** True when a bundled brief exists for every provider the UI can open. */
export function fixtureCoverage(physicianIds: readonly string[]): { covered: string[]; missing: string[] } {
  const covered: string[] = [];
  const missing: string[] = [];

  for (const id of physicianIds) {
    (findFixtureBrief(id) ? covered : missing).push(id);
  }

  return { covered, missing };
}
