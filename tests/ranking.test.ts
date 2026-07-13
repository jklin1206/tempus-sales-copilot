import { describe, expect, it } from "vitest";

import { rankByOpportunity } from "@/lib/ranking/opportunity";
import { formatDate } from "@/lib/ranking/dates";
import type { MarketRow } from "@/lib/types";

/**
 * Opportunity ranking is the only ranking in the product (SPEC.md 7).
 *
 * The urgency buckets, days-away arithmetic, and top-five daily queue that used to live
 * here are gone. The supplied data has no contacted, completed, or snoozed state and no
 * catalyst feed, so a queue that claimed to change day to day would have been theatre. The
 * tests for it are gone with it rather than left to assert behavior the product no longer has.
 */

function row(physicianId: string, likelyPatientPopulation: number): MarketRow {
  return {
    physicianId,
    oncologistName: `Dr. ${physicianId}`,
    providerOrg: "Test Oncology",
    likelyPatientPopulation,
  };
}

describe("opportunity ranking (SPEC 7)", () => {
  it("sorts by likely patient population descending", () => {
    const ranked = rankByOpportunity([row("p01", 100), row("p02", 300), row("p03", 200)]);
    expect(ranked.map((p) => p.physicianId)).toEqual(["p02", "p03", "p01"]);
  });

  it("breaks population ties by physician_id ascending, stably", () => {
    const ranked = rankByOpportunity([row("p09", 200), row("p03", 200), row("p07", 200)]);
    expect(ranked.map((p) => p.physicianId)).toEqual(["p03", "p07", "p09"]);
  });

  it("is deterministic: the same input always yields the same order", () => {
    const input = [row("p04", 150), row("p01", 310), row("p09", 140), row("p02", 240)];
    const first = rankByOpportunity(input).map((p) => p.physicianId);
    const second = rankByOpportunity(input).map((p) => p.physicianId);
    expect(first).toEqual(second);
  });

  it("does not mutate its input", () => {
    const input = [row("p01", 100), row("p02", 300)];
    rankByOpportunity(input);
    expect(input.map((p) => p.physicianId)).toEqual(["p01", "p02"]);
  });

  it("uses no signal other than population and ID", () => {
    // Two rows identical except for population. Nothing else can influence the order,
    // because nothing else is read.
    const ranked = rankByOpportunity([row("p02", 1), row("p01", 2)]);
    expect(ranked[0]?.physicianId).toBe("p01");
  });
});

describe("date display", () => {
  it("formats a CRM contact date in UTC, so it reads the same in every timezone", () => {
    expect(formatDate("2026-07-17")).toBe("Fri, Jul 17");
  });
});
