import "server-only";

import { loadMarketRows, findMarketRow } from "./data/market";
import { loadCrmNote } from "./data/crm";
import { rankByOpportunity } from "./ranking/opportunity";
import type { Provider, RankedProvider } from "./types";

/**
 * The provider/CRM join (SPEC.md 11.1).
 *
 * Every provider must reconcile to exactly one CRM note. A market row without a note is a
 * data error, not a provider to render with a blank brief, so the join throws rather than
 * degrading quietly.
 */

let cached: Provider[] | null = null;

export function loadProviders(): Provider[] {
  if (cached) return cached;

  cached = loadMarketRows().map((row) => ({
    ...row,
    crm: loadCrmNote(row.physicianId),
  }));

  return cached;
}

/** Returns one joined provider, or null when the physician ID is unknown (SPEC.md 9.3). */
export function findProvider(physicianId: string): Provider | null {
  const row = findMarketRow(physicianId);
  if (!row) return null;
  return { ...row, crm: loadCrmNote(row.physicianId) };
}

/**
 * The complete territory, ranked by estimated opportunity.
 *
 * This is the only ranking in the product. There is no second, urgency-based ordering,
 * because nothing in the supplied data supports one.
 */
export function providersByOpportunity(): RankedProvider[] {
  return rankByOpportunity(loadProviders()).map((provider, index) => ({
    ...provider,
    opportunityRank: index + 1,
  }));
}
