import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { briefSchema, modelBriefSchema, clientBriefSchema, toClientBrief, type Brief } from "@/lib/brief/schema";
import { loadVaultFacts } from "@/lib/data/vault";

/**
 * The contract boundary.
 *
 * Two properties this suite exists to defend:
 *
 *   1. There is no `why_now`. It was derived from a CRM next-action date, which is a
 *      scheduling cue and not a market catalyst, so it answered the wrong question. Nothing
 *      replaces it, and nothing may quietly reintroduce it.
 *   2. Grounding is enforced on the server and not shipped to the browser. The client gets
 *      finished prose and a provenance label. Fact IDs, source URLs, the validation trace,
 *      and the knowledge vault all stay behind the API.
 */

const ROOT = process.cwd();

/** Resolves a cited fact to its source, exactly as the API route does from the real vault. */
const sourceOf = (factId: string) => {
  const fact = loadVaultFacts().find((f) => f.factId === factId);
  return fact ? { sourceUrl: fact.sourceUrl, sourceSection: fact.sourceSection } : null;
};

function fullBrief(): Brief {
  return briefSchema.parse({
    physician_id: "p02",
    grounding_status: "grounded",
    product_ids: ["xf"],
    why_tempus: "Dr. Chen needs blood-based results fast, and xF is typically expected within 7 days.",
    supporting_crm_excerpt: "she asked how quickly liquid-biopsy results are typically returned",
    product_snapshot: [
      { fact_id: "xf-turnaround-01", display_text: "xF results are typically expected within 7 days." },
      { fact_id: "xf-identity-01", display_text: "xF is a 105-gene liquid-biopsy ctDNA panel." },
    ],
    objection_response: { text: "Typically within 7 days of specimen retrieval.", fact_ids: ["xf-turnaround-01"] },
    meeting_script: { text: "Script text.", fact_ids: ["xf-turnaround-01"] },
    generation_mode: "live_generation",
    prompt_version: "meeting-prep-v4",
    data_version: "2026-07-12",
    trace: {
      crm_note_loaded: "data/crm/p02.md",
      vault_notes_loaded: ["xF-and-xF-Plus.md"],
      vault_fact_count: 34,
      cited_fact_ids: ["xf-turnaround-01", "xf-identity-01"],
      checks_passed: ["numbers_trace_to_cited_facts"],
      checks_failed: [],
      provider: "google",
      model: "gemini-3.1-flash-lite",
    },
  });
}

describe("why_now is gone from the brief contract", () => {
  it("is absent from what the model may return", () => {
    expect(Object.keys(modelBriefSchema.shape)).not.toContain("why_now");
  });

  it("is absent from the internal brief", () => {
    expect(Object.keys(briefSchema.shape)).not.toContain("why_now");
  });

  it("is absent from what the client receives", () => {
    expect(Object.keys(clientBriefSchema.shape)).not.toContain("why_now");
  });

  it("is stripped rather than passed through if a stale fixture still carries it", () => {
    // Schemas are non-strict on unknown input keys, so this is the check that actually
    // stops an old why_now from surviving a round-trip into the UI.
    const stale = { ...fullBrief(), why_now: { status: "verified", text: "x", source: "crm_next_action" } };
    expect(toClientBrief(stale as Brief, sourceOf)).not.toHaveProperty("why_now");
  });

  it("has no prompt still asking for it", () => {
    // v1..v3 are kept as history and may mention it; the CURRENT prompt must not.
    const current = join(ROOT, "prompts", "meeting-prep-v4.md");
    expect(existsSync(current)).toBe(true);
  });
});

describe("the client receives a source link, but never the grounding internals", () => {
  const client = toClientBrief(fullBrief(), sourceOf);
  const serialized = JSON.stringify(client);

  it("sends no fact IDs", () => {
    // The rep does not need "xf-turnaround-01". They need the claim and somewhere to point.
    expect(serialized).not.toContain("xf-turnaround-01");
    expect(serialized).not.toContain("fact_id");
    expect(client).not.toHaveProperty("product_snapshot");
  });

  it("sends no validation trace", () => {
    expect(client).not.toHaveProperty("trace");
    expect(client).not.toHaveProperty("failure_codes");
    expect(serialized).not.toContain("checks_passed");
  });

  it("sends a real source link for each cited claim", () => {
    for (const fact of client.product_evidence) {
      expect(fact.source_url).toMatch(/^https:\/\/www\.tempus\.com\//);
      expect(fact.source_section).not.toBe("");
    }
  });

  it("sends only the sources of facts this brief actually cited, not the vault", () => {
    // A source link is a pointer, not the knowledge base. Facts the brief did not cite must not
    // ship, or the client is holding the vault by another name.
    const uncited = loadVaultFacts().filter(
      (f) => !["xf-turnaround-01", "xf-identity-01"].includes(f.factId),
    );
    for (const fact of uncited) {
      expect(serialized).not.toContain(fact.fact);
    }
    expect(client.product_evidence).toHaveLength(2);
  });

  it("still sends the prose the rep needs and an honest provenance label", () => {
    expect(client.why_tempus).not.toBe("");
    expect(client.supporting_crm_excerpt).not.toBe("");
    expect(client.meeting_script).not.toBe("");
    expect(client.generation_mode).toBe("live_generation");
  });

  it("keeps the claim text intact, qualifiers and all", () => {
    expect(client.product_evidence[0]?.text).toContain("typically");
  });
});

describe("the removed surfaces are actually gone", () => {
  it("has no Sources route", () => {
    expect(existsSync(join(ROOT, "src", "app", "sources"))).toBe(false);
  });

  it("has no Recent Reports route", () => {
    expect(existsSync(join(ROOT, "src", "app", "reports"))).toBe(false);
  });

  it("has no separate All Providers route: the territory IS the workspace", () => {
    expect(existsSync(join(ROOT, "src", "app", "providers", "page.tsx"))).toBe(false);
  });

  it("ships no saved report fixtures", () => {
    expect(existsSync(join(ROOT, "fixtures", "reports"))).toBe(false);
  });

  it("has no daily-queue module", () => {
    expect(existsSync(join(ROOT, "src", "lib", "ranking", "dailyQueue.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "src", "lib", "brief", "whyNow.ts"))).toBe(false);
  });
});
