import { describe, expect, it } from "vitest";

import { validateBrief } from "@/lib/validation/validate";
import { loadVaultFacts } from "@/lib/data/vault";
import { loadCrmNote } from "@/lib/data/crm";
import type { ModelBrief } from "@/lib/brief/schema";

/**
 * Validator regression suite (SPEC.md 11.3, 12.2).
 *
 * These are the adversarial cases. Each one is a brief a model could plausibly
 * return, and each must be blocked. Real vault facts and a real CRM note are used,
 * so a fact ID that stops existing breaks these tests rather than passing silently.
 */

const facts = loadVaultFacts();
const crm = loadCrmNote("p02"); // turnaround concern, NSCLC
const provider = { physicianId: "p02" };

const context = { provider, crm, facts };

/** A brief that passes every check. Each test below breaks exactly one thing. */
function groundedBrief(overrides: Partial<ModelBrief> = {}): ModelBrief {
  return {
    physician_id: "p02",
    grounding_status: "grounded",
    product_ids: ["xf"],
    why_tempus:
      "Dr. Chen wants blood-based results inside a first-line decision window, and xF results are typically expected within 7 days of specimen retrieval.",
    supporting_crm_excerpt:
      "she asked how quickly liquid-biopsy results are typically returned",
    product_snapshot: [
      {
        fact_id: "xf-turnaround-01",
        display_text: "xF results are typically expected within 7 days of specimen retrieval.",
      },
      {
        fact_id: "xf-identity-01",
        display_text: "xF is a 105-gene liquid-biopsy ctDNA panel detecting SNVs, INDELs, copy-number gains, and rearrangements.",
      },
    ],
    objection_response: {
      text: "Results are typically expected within 7 days of specimen retrieval, which fits a first-line decision window.",
      fact_ids: ["xf-turnaround-01"],
    },
    meeting_script: {
      // Exactly 68 words.
      text: "Dr. Chen, last time you asked how quickly liquid results come back for your first-line lung decisions. With xF, results are typically expected within seven days of specimen retrieval, and the panel covers one hundred five genes from a standard blood draw. That timing is a typical expectation rather than a guarantee. Could we walk your thoracic pathway team through the ordering workflow at the meeting on Wednesday, and agree a pilot case together?",
      fact_ids: ["xf-turnaround-01"],
    },
    ...overrides,
  };
}

describe("the happy path passes", () => {
  it("accepts a fully grounded brief", () => {
    const result = validateBrief(groundedBrief(), context);
    expect(result.failed).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("records the facts it cited", () => {
    const result = validateBrief(groundedBrief(), context);
    expect(result.citedFactIds).toContain("xf-turnaround-01");
  });
});

describe("fabricated facts are blocked (SPEC 12.2)", () => {
  it("rejects a fact ID that does not exist in the vault", () => {
    const brief = groundedBrief({
      product_snapshot: [
        { fact_id: "xf-turnaround-01", display_text: "Results are typically expected within 7 days." },
        { fact_id: "xf-sensitivity-99", display_text: "xF is 99.9% sensitive for everything." },
      ],
    });

    const result = validateBrief(brief, context);
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("all_cited_facts_exist_in_vault");
    expect(result.failed.some((f) => f.startsWith("fabricated_fact_ids:"))).toBe(true);
  });

  it("resolves an underscore/hyphen slip in a fact ID rather than calling it a fabrication", () => {
    // Regression. Product IDs use underscores (xt_heme) and fact IDs use hyphens
    // (xt-heme-...), and the model periodically writes "xt_heme-identity-01". That names
    // a real fact with a mistyped separator. Throwing away an otherwise grounded brief
    // over punctuation helps nobody, and the ID still has to resolve to a fact that
    // actually exists.
    const brief = groundedBrief({
      product_snapshot: [
        { fact_id: "xf_turnaround-01", display_text: "xF results are typically expected within 7 days of specimen retrieval." },
        { fact_id: "xf-identity-01", display_text: "xF is a 105-gene liquid-biopsy ctDNA panel." },
      ],
      objection_response: {
        text: "Results are typically expected within 7 days of specimen retrieval.",
        fact_ids: ["xf_turnaround-01"],
      },
      meeting_script: { text: groundedBrief().meeting_script.text, fact_ids: ["xf_turnaround-01"] },
    });

    const result = validateBrief(brief, context);
    expect(result.failed).not.toContain("all_cited_facts_exist_in_vault");
    expect(result.citedFactIds).toContain("xf-turnaround-01");
    expect(result.ok).toBe(true);
  });

  it("still rejects an ID that resolves to no fact even after normalizing separators", () => {
    const brief = groundedBrief({
      product_snapshot: [
        { fact_id: "xf_sensitivity_99", display_text: "xF is typically flawless." },
        { fact_id: "xf-identity-01", display_text: "xF is a 105-gene liquid-biopsy ctDNA panel." },
      ],
    });

    expect(validateBrief(brief, context).failed).toContain("all_cited_facts_exist_in_vault");
  });

  it("rejects a number that appears in no cited fact", () => {
    // The fact says 7 days. The prose says 3.
    const brief = groundedBrief({
      objection_response: {
        text: "Results are typically expected within 3 days of specimen retrieval.",
        fact_ids: ["xf-turnaround-01"],
      },
    });

    const result = validateBrief(brief, context);
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("numbers_trace_to_cited_facts");
  });

  it("rejects an invented performance metric", () => {
    const brief = groundedBrief({
      objection_response: {
        text: "xF is typically 99.4% accurate across all variant types.",
        fact_ids: ["xf-turnaround-01"],
      },
    });

    expect(validateBrief(brief, context).failed).toContain("numbers_trace_to_cited_facts");
  });
});

describe("dropped qualifiers are blocked", () => {
  it("rejects a snapshot that drops 'typically' from a turnaround fact", () => {
    const brief = groundedBrief({
      product_snapshot: [
        // "typically" removed: this now reads as a commitment.
        { fact_id: "xf-turnaround-01", display_text: "xF results are returned within 7 days of specimen retrieval." },
        { fact_id: "xf-identity-01", display_text: "xF is a 105-gene liquid-biopsy ctDNA panel." },
      ],
    });

    const result = validateBrief(brief, context);
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("qualifiers_preserved:xf-turnaround-01");
  });

  it("rejects prose that cites the fact but drops its qualifier", () => {
    const brief = groundedBrief({
      objection_response: {
        text: "Results come back within 7 days of specimen retrieval, every time.",
        fact_ids: ["xf-turnaround-01"],
      },
    });

    expect(validateBrief(brief, context).failed).toContain("qualifiers_preserved_in_objection:xf-turnaround-01");
  });
});

describe("prohibited claims are blocked (SPEC 11.3)", () => {
  const cases: Array<[string, string, string]> = [
    [
      "guaranteed turnaround",
      "We guarantee results within 7 days of specimen retrieval, typically.",
      "prohibited_claim:guaranteed_turnaround",
    ],
    [
      "unsupported superiority",
      "xF is typically faster than anything else on the market.",
      "prohibited_claim:unsupported_superiority",
    ],
    [
      "competitor assertion",
      "Unlike Guardant, xF typically returns results quickly.",
      "prohibited_claim:competitor_assertion",
    ],
    [
      "clinical recommendation",
      "You should order xF for this patient; results are typically expected quickly.",
      "prohibited_claim:clinical_recommendation",
    ],
    [
      "pricing claim",
      "The out-of-pocket cost is typically $0 for your patients.",
      "prohibited_claim:pricing_or_coverage_claim",
    ],
  ];

  for (const [name, text, expectedCode] of cases) {
    it(`rejects ${name}`, () => {
      const brief = groundedBrief({
        objection_response: { text, fact_ids: ["xf-turnaround-01"] },
      });

      const result = validateBrief(brief, context);
      expect(result.ok).toBe(false);
      expect(result.failed).toContain(expectedCode);
    });
  }
});

describe("an honest disclaimer is not a prohibited claim", () => {
  it("allows a brief that explicitly denies a guarantee", () => {
    // Regression, and the third of its kind. This is real gemini-3.1-flash-lite output that an
    // earlier version of the turnaround rule blocked. The model wrote the safe thing, out loud,
    // and got punished for using the word it was disclaiming. The same bug previously blocked
    // "I cannot give you out-of-pocket costs" and "a typical expectation, not a guarantee".
    const brief = groundedBrief({
      objection_response: {
        text: "xF results are typically expected within 7 days of specimen retrieval. This is a typical expectation, not a guaranteed turnaround and not a service-level agreement.",
        fact_ids: ["xf-turnaround-01"],
      },
    });

    const result = validateBrief(brief, context);
    expect(result.failed).not.toContain("prohibited_claim:guaranteed_turnaround");
    expect(result.ok).toBe(true);
  });

  it("allows 'no guarantee' and 'rather than a promise'", () => {
    for (const hedge of [
      "Results are typically expected within 7 days of specimen retrieval, though there is no guarantee.",
      "Results are typically expected within 7 days of specimen retrieval, an expectation rather than a promise.",
    ]) {
      const brief = groundedBrief({
        objection_response: { text: hedge, fact_ids: ["xf-turnaround-01"] },
      });
      expect(validateBrief(brief, context).failed, hedge).not.toContain(
        "prohibited_claim:guaranteed_turnaround",
      );
    }
  });

  it("still blocks an actual guarantee", () => {
    // The disclaimer strip must not become a loophole: an affirmative promise still fails.
    for (const claim of [
      "We guarantee results within 7 days of specimen retrieval, typically.",
      "Turnaround is typically 7 days and it is assured.",
    ]) {
      const brief = groundedBrief({
        objection_response: { text: claim, fact_ids: ["xf-turnaround-01"] },
      });
      expect(validateBrief(brief, context).failed, claim).toContain("prohibited_claim:guaranteed_turnaround");
    }
  });
});

describe("CRM excerpt must be an exact quote", () => {
  it("rejects a paraphrased excerpt", () => {
    const brief = groundedBrief({
      supporting_crm_excerpt: "Dr. Chen wanted to know about the speed of liquid biopsy results",
    });

    const result = validateBrief(brief, context);
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("crm_excerpt_is_exact_substring");
  });

  it("rejects an excerpt lifted from a different physician's note (SPEC 12.2)", () => {
    // p09's note. It must not appear in p02's brief, and it cannot: only p02's note
    // is ever loaded into the context.
    const brief = groundedBrief({
      supporting_crm_excerpt: "Dr. Santos treats hematologic malignancies and wants a combined DNA and RNA option.",
    });

    const result = validateBrief(brief, context);
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("no_cross_provider_crm_leakage");
  });

  it("tolerates re-wrapped whitespace but not re-worded text", () => {
    const brief = groundedBrief({
      supporting_crm_excerpt: "she asked how quickly   liquid-biopsy\n  results are typically returned",
    });

    expect(validateBrief(brief, context).failed).not.toContain("crm_excerpt_is_exact_substring");
  });

  it("tolerates the model's typographic glyphs", () => {
    // Regression. The model emits U+2011 non-breaking hyphens ("liquid‑biopsy") and
    // curly apostrophes. Those are the same words, and an exact-substring check that
    // compares raw code points fails a quote that is in fact verbatim.
    const brief = groundedBrief({
      supporting_crm_excerpt: "she asked how quickly liquid‑biopsy results are typically returned",
    });

    expect(validateBrief(brief, context).failed).not.toContain("crm_excerpt_is_exact_substring");
  });

  it("preserves a qualifier written with a Unicode hyphen", () => {
    const brief = groundedBrief({
      product_snapshot: [
        // "typically" is present, and the fact text uses a non-breaking hyphen.
        { fact_id: "xf-turnaround-01", display_text: "xF results are typically expected within 7 days of specimen retrieval." },
        { fact_id: "xf-identity-01", display_text: "xF is a 105‑gene liquid‑biopsy ctDNA panel." },
      ],
    });

    const result = validateBrief(brief, context);
    expect(result.failed).not.toContain("numbers_trace_to_cited_facts");
  });
});

describe("shape rules", () => {
  it("rejects a script under 65 words", () => {
    const brief = groundedBrief({
      meeting_script: { text: "Dr. Chen, results are typically expected within 7 days.", fact_ids: ["xf-turnaround-01"] },
    });

    expect(validateBrief(brief, context).failed).toContain("script_word_count_65_to_80");
  });

  it("rejects a script over 80 words", () => {
    const brief = groundedBrief({
      meeting_script: {
        text: `${groundedBrief().meeting_script.text} ${"And one more thought about the workflow. ".repeat(4)}`,
        fact_ids: ["xf-turnaround-01"],
      },
    });

    expect(validateBrief(brief, context).failed).toContain("script_word_count_65_to_80");
  });

  it("rejects a grounded snapshot with fewer than 2 facts", () => {
    const brief = groundedBrief({
      product_snapshot: [
        { fact_id: "xf-turnaround-01", display_text: "Results are typically expected within 7 days of specimen retrieval." },
      ],
    });

    expect(validateBrief(brief, context).failed).toContain("snapshot_has_2_to_4_facts");
  });

  it("rejects a script that cites a fact absent from the snapshot", () => {
    const brief = groundedBrief({
      meeting_script: { text: groundedBrief().meeting_script.text, fact_ids: ["xf-plus-turnaround-01"] },
    });

    expect(validateBrief(brief, context).failed).toContain("script_facts_appear_in_snapshot");
  });
});

describe("abstention (SPEC 12.1 scenario 8)", () => {
  const crmP01 = loadCrmNote("p01"); // reimbursement concern, which no fact supports
  const abstainContext = { provider: { physicianId: "p01" }, crm: crmP01, facts };

  function abstainBrief(overrides: Partial<ModelBrief> = {}): ModelBrief {
    return {
      physician_id: "p01",
      grounding_status: "abstain",
      product_ids: [],
      why_tempus:
        "Dr. Ruiz is open to comprehensive tissue profiling, but her question is about cost, which the approved product facts do not address.",
      supporting_crm_excerpt:
        "She asked for specifics on patient out-of-pocket exposure and the reimbursement pathway before considering a change.",
      product_snapshot: [],
      objection_response: {
        text: "I cannot answer this from approved product facts. Reimbursement and patient cost questions need our market access team, and I would rather bring you an accurate answer than an approximate one.",
        fact_ids: [],
      },
      meeting_script: {
        // 69 words, no product facts cited.
        text: "Dr. Ruiz, you asked about patient cost exposure and the reimbursement pathway, and I want to be straight with you: I do not have approved answers on that, and I am not going to guess at something that affects your patients. What I can do is bring our market access specialist to your practice review so you get precise answers. Would Friday work for a short joint call?",
        fact_ids: [],
      },
      abstention_reason:
        "The runtime vault carries no pricing, payer-coverage, or out-of-pocket facts, so no supplied fact supports this concern.",
      ...overrides,
    };
  }

  it("accepts a clean abstention", () => {
    const result = validateBrief(abstainBrief(), abstainContext);
    expect(result.failed).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("does not block an abstention for naming the topic it declines", () => {
    // Regression. This is real model output that an earlier version of the pricing rule
    // blocked, because the rule matched the words "out-of-pocket costs" wherever they
    // appeared. The model was doing exactly the right thing: you cannot abstain from a
    // cost question without saying the word "cost".
    const brief = abstainBrief({
      objection_response: {
        text: "I understand you are looking for details on patient out-of-pocket costs and the reimbursement pathway for our tests. Unfortunately, our approved product facts do not include pricing or coverage information, so I cannot provide that data at this time. I will connect you with our reimbursement specialist who can give you the appropriate details.",
        fact_ids: [],
      },
    });

    const result = validateBrief(brief, abstainContext);
    expect(result.failed).not.toContain("prohibited_claim:pricing_or_coverage_claim");
    expect(result.ok).toBe(true);
  });

  it("still blocks an abstention that states an actual price", () => {
    const brief = abstainBrief({
      objection_response: {
        text: "Most of your patients are fully covered by Medicare, and out-of-pocket is $0.",
        fact_ids: [],
      },
    });

    expect(validateBrief(brief, abstainContext).failed).toContain("prohibited_claim:pricing_or_coverage_claim");
  });

  it("rejects an abstention that still cites a product fact", () => {
    // The trap: answering a cost question by reaching for a turnaround fact.
    const brief = abstainBrief({
      objection_response: {
        text: "On cost I cannot help, but results are typically expected within 7 days of specimen retrieval.",
        fact_ids: ["xf-turnaround-01"],
      },
    });

    const result = validateBrief(brief, abstainContext);
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("abstention_cites_no_facts");
  });

  it("rejects an abstention with no stated reason", () => {
    const brief = abstainBrief({ abstention_reason: undefined });
    expect(validateBrief(brief, abstainContext).failed).toContain("abstention_states_a_reason");
  });

  it("rejects an abstention that quietly ships a product snapshot", () => {
    const brief = abstainBrief({
      product_snapshot: [
        { fact_id: "xf-turnaround-01", display_text: "Results are typically expected within 7 days." },
      ],
    });

    expect(validateBrief(brief, abstainContext).failed).toContain("abstention_snapshot_is_empty");
  });
});

describe("identity", () => {
  it("rejects a brief written for a different physician", () => {
    const brief = groundedBrief({ physician_id: "p09" });
    expect(validateBrief(brief, context).failed).toContain("physician_id_matches_request");
  });
});
