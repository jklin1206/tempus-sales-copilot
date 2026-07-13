/**
 * The eight author-labeled golden scenarios (SPEC.md 12.1).
 *
 * These replace the old evals/scenarios.csv, whose `expected_behavior` column used
 * states that do not exist in the brief contract (`qualified_response`,
 * `supported_with_caveat`). Every expectation here maps to a real grounding_status
 * and to checks the validator actually performs.
 *
 * `requiredFactIds` are facts the brief MUST cite to be considered a correct answer
 * to this physician's concern. `forbidden` are patterns that must never appear.
 */

export interface GoldenScenario {
  id: number;
  physicianId: string;
  concern: string;
  expectedStatus: "grounded" | "abstain";
  /** At least one of these must be cited. Any one is a correct answer to the concern. */
  requiredAnyOf?: string[];
  /** Products the angle must stay within. Catches a brief that wanders off-concern. */
  expectedProducts?: string[];
  forbidden?: RegExp[];
  note?: string;
}

export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    id: 1,
    physicianId: "p02",
    concern: "turnaround time for liquid biopsy",
    expectedStatus: "grounded",
    requiredAnyOf: ["xf-turnaround-01", "xf-plus-turnaround-01"],
    expectedProducts: ["xf", "xf_plus"],
    // Forbid an affirmative guarantee, not the word. Writing "typically expected, not a
    // guarantee" is exactly the honest hedge this brief should make, and an earlier
    // version of this rule failed the model for getting that right.
    forbidden: [/\b(we|tempus)\s+guarantee|guaranteed\s+(results?|turnaround|delivery)/i],
  },
  {
    id: 2,
    physicianId: "p03",
    concern: "insufficient tissue and repeat biopsy",
    expectedStatus: "grounded",
    requiredAnyOf: ["xt-xf-conversion-01", "xf-ordering-conversion-01", "xf-identity-01", "xf-plus-identity-01"],
    expectedProducts: ["xf", "xf_plus", "xt_cdx"],
  },
  {
    id: 3,
    physicianId: "p11",
    concern: "comprehensive liquid-biopsy coverage",
    expectedStatus: "grounded",
    requiredAnyOf: ["xf-plus-identity-01"],
    expectedProducts: ["xf_plus", "xf"],
    // The source states a gene count, not a comparison. "Largest panel" is unsupported.
    forbidden: [/\b(largest|broadest|most comprehensive)\b/i],
  },
  {
    id: 4,
    physicianId: "p07",
    concern: "fusion detection with DNA-only testing",
    expectedStatus: "grounded",
    requiredAnyOf: ["xr-capability-01", "xr-fusion-coverage-01", "xr-splicing-01", "xr-study-fusion-uplift-01"],
    expectedProducts: ["xr", "xt_cdx"],
  },
  {
    id: 5,
    physicianId: "p08",
    concern: "tissue-panel breadth and RNA coverage",
    expectedStatus: "grounded",
    requiredAnyOf: ["xt-cdx-identity-01", "cts-solid-tumor-bundle-01", "xr-capability-01", "xr-fusion-coverage-01"],
    expectedProducts: ["xt_cdx", "xr"],
  },
  {
    id: 6,
    physicianId: "p09",
    concern: "heme-panel breadth and turnaround",
    expectedStatus: "grounded",
    requiredAnyOf: ["xt-heme-identity-01", "xt-heme-considerations-01", "xt-heme-turnaround-01", "cts-heme-bundle-01"],
    expectedProducts: ["xt_heme", "xr"],
  },
  {
    id: 7,
    physicianId: "p04",
    concern: "satisfied with current vendor",
    expectedStatus: "grounded",
    requiredAnyOf: ["xr-capability-01", "xr-fusion-coverage-01", "xr-splicing-01", "xr-study-fusion-uplift-01", "cts-solid-tumor-bundle-01"],
    expectedProducts: ["xr", "xt_cdx"],
    forbidden: [/\b(better than|faster than|superior|competitor|switch from)\b/i],
    note: "Must add value without asserting anything about the incumbent laboratory.",
  },
  {
    id: 8,
    physicianId: "p01",
    concern: "cost and reimbursement",
    expectedStatus: "abstain",
    forbidden: [/\$\d/, /\bcopay\b/i],
    note: "The vault carries no pricing or coverage fact, so the only correct answer is to abstain.",
  },
];
