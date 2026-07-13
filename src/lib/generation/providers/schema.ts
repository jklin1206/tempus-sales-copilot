import { PRODUCT_IDS } from "../../types";

/**
 * The JSON Schema the provider enforces at the API.
 *
 * It mirrors modelBriefSchema in brief/schema.ts, which re-validates the parsed result:
 * the provider's schema is a strong hint, and Zod is the thing that actually decides.
 *
 * Note `required` lists every property, so there is no such thing as an optional field:
 * `abstention_reason` is always requested and comes back as "" when the brief is grounded.
 * Strict structured-output modes tend to demand this, and it is worth keeping regardless,
 * because a field the model may silently omit is a field the validator cannot reason about.
 */
export const BRIEF_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "physician_id",
    "grounding_status",
    "product_ids",
    "why_tempus",
    "supporting_crm_excerpt",
    "product_snapshot",
    "objection_response",
    "meeting_script",
    "abstention_reason",
  ],
  properties: {
    physician_id: { type: "string" },
    grounding_status: { type: "string", enum: ["grounded", "abstain"] },
    product_ids: {
      type: "array",
      maxItems: 3,
      items: { type: "string", enum: [...PRODUCT_IDS] },
    },
    why_tempus: {
      type: "string",
      description: "One or two sentences tying this physician's CRM context to supported product evidence.",
    },
    supporting_crm_excerpt: { type: "string" },
    product_snapshot: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fact_id", "display_text"],
        properties: {
          fact_id: { type: "string" },
          display_text: { type: "string" },
        },
      },
    },
    objection_response: {
      type: "object",
      additionalProperties: false,
      required: ["text", "fact_ids"],
      properties: {
        text: { type: "string" },
        fact_ids: { type: "array", maxItems: 4, items: { type: "string" } },
      },
    },
    meeting_script: {
      type: "object",
      additionalProperties: false,
      required: ["text", "fact_ids"],
      properties: {
        text: { type: "string" },
        fact_ids: { type: "array", maxItems: 2, items: { type: "string" } },
      },
    },
    abstention_reason: {
      type: "string",
      description: "Why no supplied fact supports the concern. Empty string when grounded.",
    },
  },
} as const;
