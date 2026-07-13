import { describe, expect, it } from "vitest";

import { loadMarketRows } from "@/lib/data/market";
import { loadCrmNote } from "@/lib/data/crm";
import { loadVaultFacts } from "@/lib/data/vault";
import { loadProviders, providersByOpportunity } from "@/lib/providers";
import { findFixtureBrief, fixtureCoverage } from "@/lib/fixtures";
import { PRODUCT_IDS } from "@/lib/types";

/**
 * Data-contract regression suite. A broken join or an unsourced fact fails the build rather
 * than surfacing as a blank panel in the demo.
 */

const EXPECTED_PHYSICIANS = ["p01", "p02", "p03", "p04", "p07", "p08", "p09", "p11"];

describe("market data (SPEC 6.1)", () => {
  it("holds the eight-provider fictional territory", () => {
    const rows = loadMarketRows();
    expect(rows).toHaveLength(8);
    expect(rows.map((r) => r.physicianId).sort()).toEqual(EXPECTED_PHYSICIANS);
  });

  it("carries a positive population for every provider", () => {
    for (const row of loadMarketRows()) {
      expect(row.likelyPatientPopulation).toBeGreaterThan(0);
      expect(Number.isInteger(row.likelyPatientPopulation)).toBe(true);
    }
  });
});

describe("provider/CRM join (SPEC 11.1)", () => {
  it("reconciles all eight providers to exactly one CRM note each", () => {
    const providers = loadProviders();
    expect(providers).toHaveLength(8);
    for (const p of providers) {
      expect(p.crm.physicianId).toBe(p.physicianId);
    }
  });

  it("refuses an unknown physician ID rather than reading an arbitrary path", () => {
    expect(() => loadCrmNote("p99")).toThrow(/No CRM note found/);
    expect(() => loadCrmNote("../../etc/passwd")).toThrow(/invalid physician ID/);
  });

  it("keeps CRM bodies free of patient identifiers", () => {
    const banned = /\b(mrn|ssn|date of birth|dob)\b/i;
    for (const p of loadProviders()) {
      expect(p.crm.body).not.toMatch(banned);
    }
  });

  it("carries no next-action scheduling field", () => {
    // The CRM note used to expose next_action_date, which drove a daily queue and a
    // "why now". Both were removed: a scheduling cue in a snapshot is not a market
    // catalyst. If either field returns, so does the temptation to rank on it.
    for (const p of loadProviders()) {
      expect(p.crm).not.toHaveProperty("nextActionDate");
      expect(p.crm).not.toHaveProperty("nextActionType");
    }
  });

  it("carries no scheduled next step in the note body either", () => {
    // Removing the frontmatter field was not enough: the note bodies still ended with
    // "Next step: discuss at the thoracic pathway meeting on 2026-07-15." A real CRM export
    // carries no guarantee that a next meeting is scheduled, or dated, or accurate. Building
    // anything on that line -- ranking, urgency, a "why now" -- would be building on data we
    // cannot count on, and leaving it visible implies we have it.
    //
    // What the note keeps is what a rep genuinely knows: who the physician is, what they said,
    // and what they are worried about.
    for (const p of loadProviders()) {
      expect(p.crm.body, p.physicianId).not.toMatch(/next step/i);
      expect(p.crm.body, p.physicianId).not.toMatch(/\b20\d{2}-\d{2}-\d{2}\b/);
    }
  });
});

describe("the single ranking", () => {
  it("ranks the full territory by estimated opportunity", () => {
    const ranked = providersByOpportunity();
    expect(ranked.map((p) => p.physicianId)).toEqual(["p01", "p02", "p11", "p03", "p07", "p08", "p04", "p09"]);
  });

  it("numbers the opportunity rank from 1", () => {
    const ranked = providersByOpportunity();
    expect(ranked.map((p) => p.opportunityRank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("knowledge vault (SPEC 6.3)", () => {
  const facts = loadVaultFacts();

  it("holds 25 to 35 runtime facts", () => {
    // Kept at one claim per fact because the validator needs it, not because a user counts
    // them. Nobody sees this number any more; the qualifier checks still depend on it.
    expect(facts.length).toBeGreaterThanOrEqual(25);
    expect(facts.length).toBeLessThanOrEqual(35);
  });

  it("gives every fact a source URL, a section, and a retrieval date", () => {
    for (const fact of facts) {
      expect(fact.sourceUrl, `${fact.factId} source`).toMatch(/^https:\/\/www\.tempus\.com\//);
      expect(fact.sourceSection, `${fact.factId} section`).not.toBe("");
      expect(fact.retrieved, `${fact.factId} retrieved`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("gives every fact a claim, a constraint, and at least one known product", () => {
    for (const fact of facts) {
      expect(fact.fact, `${fact.factId} claim`).not.toBe("");
      expect(fact.constraints, `${fact.factId} constraints`).not.toBe("");
      expect(fact.productIds.length, `${fact.factId} products`).toBeGreaterThan(0);
      for (const id of fact.productIds) {
        expect(PRODUCT_IDS).toContain(id);
      }
    }
  });

  it("keeps fact IDs unique across the vault", () => {
    const ids = facts.map((f) => f.factId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves the qualifier on claims that must not be read as guarantees", () => {
    const turnaround = facts.find((f) => f.factId === "xf-turnaround-01");
    expect(turnaround?.qualifiers).toContainEqual(["typically"]);
    expect(turnaround?.timingAnchor).toBe("specimen retrieval");
  });

  it("lets a qualifier accept several surface forms of the same concept", () => {
    const coverage = facts.find((f) => f.factId === "xr-fusion-coverage-01");
    const alternates = coverage?.qualifiers.find((q) => q.includes("more than 100"));
    expect(alternates).toContain("over 100");
  });

  it("holds facts and not sales logic", () => {
    const banned = /sales_safe|study_qualified|technical_only|needs_review|objection[_-]?to[_-]?claim/i;
    for (const fact of facts) {
      expect(`${fact.fact} ${fact.constraints}`, fact.factId).not.toMatch(banned);
    }
  });

  it("contains no fact that could answer a pricing or coverage question", () => {
    // The reimbursement scenario must abstain because nothing supports it, not because the
    // model was told to. If a pricing fact is ever added, that scenario's premise breaks and
    // this test should fail loudly.
    const pricing = /out-of-pocket|reimbursement|copay|price|pricing|payer coverage/i;
    expect(facts.filter((f) => pricing.test(f.fact)).map((f) => f.factId)).toEqual([]);
  });
});

describe("bundled fixtures (SPEC 13)", () => {
  it("covers every provider the UI can open, not just a subset", () => {
    // All eight are reachable from the territory list and from search. A no-key reviewer
    // must not hit an empty panel on any of them.
    const { missing } = fixtureCoverage(loadProviders().map((p) => p.physicianId));
    expect(missing).toEqual([]);
  });

  it("records the reimbursement scenario as a genuine abstention", () => {
    const brief = findFixtureBrief("p01");
    expect(brief?.grounding_status).toBe("abstain");
    expect(brief?.product_snapshot).toEqual([]);
    expect(brief?.objection_response.fact_ids).toEqual([]);
    expect(brief?.abstention_reason ?? "").not.toBe("");
  });

  it("ships no fixture the product itself would block", () => {
    for (const id of EXPECTED_PHYSICIANS) {
      expect(findFixtureBrief(id)?.grounding_status, id).not.toBe("validation_failed");
    }
  });

  it("carries no why_now field", () => {
    for (const id of EXPECTED_PHYSICIANS) {
      expect(findFixtureBrief(id)).not.toHaveProperty("why_now");
    }
  });
});
