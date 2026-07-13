/** Shared domain types. Input contracts live in SPEC.md section 6. */

/** Stable product identifiers. The vault references products by ID, not display name. */
export const PRODUCT_IDS = ["xt_cdx", "xr", "xf", "xf_plus", "xt_heme"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export const PRODUCT_NAMES: Record<ProductId, string> = {
  xt_cdx: "Tempus xT CDx",
  xr: "Tempus xR",
  xf: "Tempus xF",
  xf_plus: "Tempus xF+",
  xt_heme: "Tempus xT Heme",
};

export function isProductId(value: string): value is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(value);
}

/** One row of mock market intelligence. Owns identity, organization, and opportunity size only. */
export interface MarketRow {
  physicianId: string;
  oncologistName: string;
  providerOrg: string;
  /**
   * Mock annual opportunity-size estimate, and a directional proxy only.
   *
   * It is not conversion probability, revenue, product fit, testing volume, or clinical
   * suitability, and it never influences which product a brief discusses.
   */
  likelyPatientPopulation: number;
}

/**
 * One physician's CRM note. Owns relationship, concern, and interest.
 *
 * There is deliberately no next-action date here. The product used to rank a daily queue
 * on one and derive a "why now" from it, and both were removed: a scheduling cue in a
 * snapshot CSV is not a market catalyst, and the supplied data has no contacted,
 * completed, or snoozed state that would make a changing daily queue credible.
 */
export interface CrmNote {
  physicianId: string;
  lastContact: string;
  /**
   * The note body exactly as authored. A generated supporting_crm_excerpt must be an
   * exact substring of this text, so it must never be reformatted or trimmed after loading.
   */
  body: string;
}

/** One sourced product fact from the runtime vault. Server-side only; never sent to the browser. */
export interface ProductFact {
  factId: string;
  productIds: ProductId[];
  /** Exactly one factual claim, quotable as-is. */
  fact: string;
  /**
   * Concepts that must survive in any prose citing this fact. Empty when the fact needs none.
   *
   * Each entry is a list of acceptable surface forms, and any one of them satisfies that
   * qualifier: `[["typically"], ["more than 100", "over 100"]]`. The qualifier is the
   * concept, not one blessed spelling of it.
   */
  qualifiers: string[][];
  /** Numbers, units, thresholds, variant classes, laboratories, cohorts. */
  measurement: string | null;
  /** The event a duration is measured from, e.g. "specimen retrieval". */
  timingAnchor: string | null;
  /** Usage limits, enforced by the safety validator rather than by string matching. */
  constraints: string;
  sourceUrl: string;
  sourceSection: string;
  retrieved: string;
  /** Vault file this fact was loaded from. Internal provenance only. */
  sourceFile: string;
}

/** A provider joined to its CRM note. */
export interface Provider extends MarketRow {
  crm: CrmNote;
}

/** A provider with its position in the opportunity ranking. */
export interface RankedProvider extends Provider {
  opportunityRank: number;
}
