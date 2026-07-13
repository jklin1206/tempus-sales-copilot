import { z } from "zod";

import { PRODUCT_IDS } from "../types";

/**
 * The structured brief contract (SPEC.md 10).
 *
 * Three schemas, and the split is the point:
 *
 *   modelBriefSchema   what the LLM is allowed to return.
 *   briefSchema        the full internal brief: model output plus provenance, the fact
 *                      IDs behind every claim, and the validation trace. Server-side only.
 *   clientBriefSchema  what actually crosses the wire to the browser.
 *
 * The browser gets the finished, validated prose, plus the source link behind each claim it
 * actually cited. It does not get fact IDs, the validation trace, or any part of the knowledge
 * vault beyond those sources. Grounding is a property the server enforces, not a thing the rep is
 * asked to audit mid-conversation; the source link is there so they have somewhere to point when a
 * physician pushes back, which is a different job from auditing.
 *
 * There is no `why_now`. It used to be derived from a CRM next-action date, which is a
 * scheduling cue rather than a market catalyst, so it answered the wrong question. A real
 * "why now" needs a governed, dated catalyst feed (approvals, guideline changes,
 * publications), which is described in SPEC.md as a production capability and is not
 * simulated here.
 */

const factReferenceSchema = z.object({
  fact_id: z.string().min(1),
  /** Rep-facing phrasing of the fact. Validated against the source fact's qualifiers and numbers. */
  display_text: z.string().min(1),
});

export const modelBriefSchema = z.object({
  physician_id: z.string(),
  /** The model may only claim `grounded` or `abstain`. `validation_failed` is a verdict code assigns. */
  grounding_status: z.enum(["grounded", "abstain"]),
  /** Products the brief actually cites facts for. Checked against the cited facts. */
  product_ids: z.array(z.enum(PRODUCT_IDS)).max(3),
  /** Why Tempus is relevant to THIS provider: their CRM context tied to supported evidence. */
  why_tempus: z.string().min(1).max(600),
  /** Must be an exact substring of the selected CRM note. Enforced in the factual validator. */
  supporting_crm_excerpt: z.string().min(10),
  product_snapshot: z.array(factReferenceSchema).max(4),
  objection_response: z.object({
    text: z.string().min(1),
    fact_ids: z.array(z.string()).max(4),
  }),
  meeting_script: z.object({
    text: z.string().min(1),
    fact_ids: z.array(z.string()).max(2),
  }),
  /** Required when abstaining: what the rep should do instead. */
  abstention_reason: z.string().optional(),
});

export type ModelBrief = z.infer<typeof modelBriefSchema>;

/**
 * Two states, because there are only two things worth telling the rep apart.
 *
 * `live_generation` — written for you, just now.
 * `demo_fixture`    — a bundled, prerecorded brief. Served in demo mode, which the app is in when
 *                     no model key is configured, and only then.
 *
 * `demo_fixture` no longer means "something went wrong and we reached for a recording". A live
 * brief that the model could not produce, or that the validator blocked, now fails visibly. See
 * src/lib/mode.ts.
 *
 * There used to be a third, `cached_generation`, and the UI labeled it. That was an
 * implementation detail leaking into a sales tool: "cached" tells a rep nothing they can act on,
 * and it invited them to wonder whether the prose in front of them was stale. The cache is gone
 * and so is the label. The fixture state stays, because that is the one case where saying nothing
 * would be a lie.
 */
export const GENERATION_MODES = ["live_generation", "demo_fixture"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const GROUNDING_STATUSES = ["grounded", "abstain", "validation_failed"] as const;
export type GroundingStatus = (typeof GROUNDING_STATUSES)[number];

export const briefSchema = modelBriefSchema.extend({
  grounding_status: z.enum(GROUNDING_STATUSES),
  // The min-length rules above constrain what the MODEL must return. They must not
  // constrain the internal brief, because a `validation_failed` brief deliberately carries
  // no prose at all: blocking the pitch means blocking every sentence of it.
  why_tempus: z.string().max(600),
  supporting_crm_excerpt: z.string(),
  objection_response: z.object({
    text: z.string(),
    fact_ids: z.array(z.string()).max(4),
  }),
  meeting_script: z.object({
    text: z.string(),
    fact_ids: z.array(z.string()).max(2),
  }),
  generation_mode: z.enum(GENERATION_MODES),
  prompt_version: z.string(),
  data_version: z.string(),
  /** Observable operations only. Never chain-of-thought. Server-side and eval use only. */
  trace: z
    .object({
      crm_note_loaded: z.string(),
      vault_notes_loaded: z.array(z.string()),
      vault_fact_count: z.number(),
      cited_fact_ids: z.array(z.string()),
      checks_passed: z.array(z.string()),
      checks_failed: z.array(z.string()),
      latency_ms: z.number().optional(),
      provider: z.string().optional(),
      model: z.string().optional(),
      /** True when the first draft was rejected and this brief is the repair (SPEC.md 8.2). */
      repaired: z.boolean().optional(),
    })
    .optional(),
  /** Set when generated prose was blocked. Server-side only; the client gets a status, not codes. */
  failure_codes: z.array(z.string()).optional(),
});

export type Brief = z.infer<typeof briefSchema>;

/**
 * One product fact as the rep sees it: the claim, and where it came from.
 *
 * The fact ID stays on the server. A rep does not need `xf-turnaround-01`; they need to be able
 * to click through to the Tempus page the claim came from when a physician pushes back.
 */
export const clientFactSchema = z.object({
  text: z.string(),
  source_url: z.string(),
  /** The section of that page, e.g. "Turnaround Time". */
  source_section: z.string(),
});

export type ClientFact = z.infer<typeof clientFactSchema>;

/**
 * What the browser receives.
 *
 * Finished prose, a provenance label, and a source link per claim. No fact IDs, no validation
 * trace, and no part of the knowledge vault beyond the specific facts this brief actually cited.
 */
export const clientBriefSchema = z.object({
  physician_id: z.string(),
  grounding_status: z.enum(GROUNDING_STATUSES),
  generation_mode: z.enum(GENERATION_MODES),
  why_tempus: z.string(),
  supporting_crm_excerpt: z.string(),
  product_evidence: z.array(clientFactSchema),
  objection_response: z.string(),
  meeting_script: z.string(),
  abstention_reason: z.string().optional(),
});

export type ClientBrief = z.infer<typeof clientBriefSchema>;

/** Where a cited fact came from. Resolved by the caller, which has the vault; this file does not. */
export type SourceLookup = (factId: string) => { sourceUrl: string; sourceSection: string } | null;

/** Strips everything the rep does not need and the client must not have. */
export function toClientBrief(brief: Brief, sourceOf: SourceLookup): ClientBrief {
  return clientBriefSchema.parse({
    physician_id: brief.physician_id,
    grounding_status: brief.grounding_status,
    generation_mode: brief.generation_mode,
    why_tempus: brief.why_tempus,
    supporting_crm_excerpt: brief.supporting_crm_excerpt,
    product_evidence: brief.product_snapshot.map((item) => {
      const source = sourceOf(item.fact_id);
      return {
        text: item.display_text,
        source_url: source?.sourceUrl ?? "",
        source_section: source?.sourceSection ?? "",
      };
    }),
    objection_response: brief.objection_response.text,
    meeting_script: brief.meeting_script.text,
    abstention_reason: brief.abstention_reason,
  });
}

/**
 * Request body for POST /api/brief (SPEC.md 9.3).
 *
 * There is no `forceRefresh` any more. Every request generates, so there is nothing to force.
 */
export const briefRequestSchema = z.object({
  physicianId: z.string(),
});
