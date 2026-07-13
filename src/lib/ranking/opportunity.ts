import type { MarketRow } from "../types";

/**
 * Complete territory opportunity ranking (SPEC.md 7.1).
 *
 * Sort by likely_patient_population descending, then physician_id ascending as a
 * stable tie-breaker. No LLM, no embedding, no weighted score.
 *
 * The population estimate is the only opportunity signal the mock market data
 * supplies, so the UI calls this "estimated opportunity" and not a conversion or
 * clinical-impact score.
 */
export function rankByOpportunity<T extends MarketRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.likelyPatientPopulation !== b.likelyPatientPopulation) {
      return b.likelyPatientPopulation - a.likelyPatientPopulation;
    }
    return a.physicianId.localeCompare(b.physicianId);
  });
}
