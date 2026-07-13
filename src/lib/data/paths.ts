import "server-only";

import { join } from "node:path";

/**
 * Allowlisted server-side data roots (SPEC.md 11.4).
 *
 * Nothing here lives under public/, so CRM notes and product knowledge are never
 * served as static assets. Physician IDs are matched against the market CSV
 * before any path is built from them, so a caller cannot traverse out of data/crm.
 */
const ROOT = process.cwd();

export const MARKET_CSV = join(ROOT, "data", "market", "providers.csv");
export const CRM_DIR = join(ROOT, "data", "crm");
export const VAULT_DIR = join(ROOT, "knowledge-vault", "Products");
export const PROMPTS_DIR = join(ROOT, "prompts");
export const FIXTURES_DIR = join(ROOT, "fixtures");

/** Physician IDs are exactly this shape. Anything else never reaches the filesystem. */
export const PHYSICIAN_ID_PATTERN = /^p\d{2}$/;

export function crmNotePath(physicianId: string): string {
  if (!PHYSICIAN_ID_PATTERN.test(physicianId)) {
    throw new Error(`Refusing to build a CRM path from an invalid physician ID: ${physicianId}`);
  }
  return join(CRM_DIR, `${physicianId}.md`);
}
