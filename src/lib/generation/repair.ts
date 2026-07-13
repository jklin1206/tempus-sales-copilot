import "server-only";

import { fenceUntrusted, type BuiltPrompt } from "./prompt";
import type { ModelBrief } from "../brief/schema";

/**
 * The repair pass (SPEC.md 8.2).
 *
 * A rejected brief gets exactly one more call, and that call is not a redraw. It shows the model
 * the draft the validator threw out, names the checks that failed in language the model can act
 * on, and asks for a corrected brief.
 *
 * This replaces a five-attempt retry loop. Five independent draws worked, in the sense that the
 * numbers came out fine, but it was the wrong mechanism for three reasons:
 *
 *   1. Nothing was learned between draws. Attempt five ran the identical prompt as attempt one
 *      and hoped for a better sample. The validator knows exactly what was wrong -- it names the
 *      dropped qualifier and the fabricated number -- and none of that reached the model.
 *   2. Five draws is up to five times the latency and cost, on the path where a rep is waiting.
 *   3. It quietly changed what the retry count was measuring. A prompt that needs four samples to
 *      land is a weaker prompt than one that lands in two, and a loop that keeps drawing until
 *      something passes hides that difference.
 *
 * One draft, one repair. If the repair is also rejected, the brief is blocked and the rep is
 * told. The validator gates the repaired brief exactly as it gated the first, so this cannot
 * launder a bad brief: a repair that fixes the qualifier and invents a number still fails.
 */

/** One instruction the model can act on, keyed so a generic code and its detailed partner collapse. */
interface Instruction {
  key: string;
  text: string;
}

/**
 * Turns one validator failure code into an instruction.
 *
 * The validator emits two kinds of code for some rules: a bare check name
 * (`numbers_trace_to_cited_facts`) and a detail code carrying the specifics
 * (`fabricated_numbers:105,7`). Both map to the same `key`, and the detailed one is applied
 * second, so the model is told "the number 105 appears in your prose and no fact you cited
 * states it" rather than "a number did not trace".
 *
 * An unrecognized code returns null rather than a vague "something failed" line. A repair
 * instruction the model cannot act on is worse than silence: it spends attention and points
 * nowhere. If a new check starts firing and no instruction exists for it, the repair pass simply
 * does not mention it, and `repair.test.ts` fails, which is the signal to write one.
 */
function instructionFor(code: string): Instruction | null {
  const separator = code.indexOf(":");
  const name = separator === -1 ? code : code.slice(0, separator);
  const detail = separator === -1 ? "" : code.slice(separator + 1);

  switch (name) {
    case "physician_id_matches_request":
      return { key: "physician_id", text: "physician_id must be exactly the physician ID you were given." };

    case "all_cited_facts_exist_in_vault":
      return {
        key: "fact_ids",
        text: "Every fact_id you cite must be one of the IDs listed in the supplied facts. Cite no others.",
      };
    case "fabricated_fact_ids":
      return {
        key: "fact_ids",
        text: `These fact IDs do not exist in the supplied facts: ${detail}. Replace each one with a real fact ID from the list, or remove the claim it supports.`,
      };

    case "product_ids_agree_with_cited_facts":
      return {
        key: "product_ids",
        text: "product_ids must name only products that the facts you cited actually belong to. Drop any product you have no cited fact for.",
      };

    case "crm_excerpt_is_exact_substring":
    case "no_cross_provider_crm_leakage":
      return {
        key: "crm_excerpt",
        text: "supporting_crm_excerpt must be copied word for word from the CRM note above. Do not paraphrase, summarize, tidy, or join two sentences. Copy a span of characters exactly as it appears.",
      };

    case "qualifiers_preserved":
      return {
        key: `qualifiers:${detail}`,
        text: `Your display_text for ${detail} dropped a required qualifier. Reread that fact and keep its hedging words ("typically", "retrospective", "identified fusions", and so on) exactly as the fact states them. The qualifier is the claim.`,
      };
    case "qualifiers_preserved_in_objection":
      return {
        key: `qualifiers_objection:${detail}`,
        text: `Your objection_response cites ${detail} but drops a required qualifier from it. Restate the fact with its hedging words intact.`,
      };
    case "qualifiers_preserved_in_script":
      return {
        key: `qualifiers_script:${detail}`,
        text: `Your meeting_script cites ${detail} but drops a required qualifier from it. Restate the fact with its hedging words intact.`,
      };

    case "numbers_trace_to_cited_facts":
      return {
        key: "numbers",
        text: "Every number in your prose must appear in a fact you cited. Remove any number you cannot point at a cited fact for.",
      };
    case "fabricated_numbers":
      return {
        key: "numbers",
        text: `These numbers appear in your prose and no fact you cited states them: ${detail}. Either cite the fact that does state each number, or remove it. Do not round, convert, or restate a figure.`,
      };

    case "no_prohibited_claims":
      return {
        key: "prohibited",
        text: "Your prose makes a claim the supplied facts cannot support. Remove it.",
      };
    case "prohibited_claim":
      return prohibitedInstruction(detail);

    case "script_word_count_65_to_80":
      return {
        key: "script_length",
        text: "meeting_script.text must be between 65 and 80 words.",
      };
    case "script_word_count":
      return {
        key: "script_length",
        text: `meeting_script.text is ${detail} words. It must be between 65 and 80. Adjust the wording, not the evidence: do not add a claim to reach the count, and do not cut a qualifier to come under it.`,
      };

    case "script_cites_at_most_two_facts":
      return { key: "script_facts", text: "meeting_script may cite at most two fact IDs. Keep the two that matter." };

    case "snapshot_has_2_to_4_facts":
      return {
        key: "snapshot_size",
        text: "product_snapshot must hold between 2 and 4 facts when you are grounded.",
      };

    case "grounded_objection_cites_a_fact":
      return {
        key: "objection_facts",
        text: 'A grounded objection_response must cite at least one fact ID. If no supplied fact answers the physician\'s concern, do not reach for an adjacent one: set grounding_status to "abstain" instead.',
      };

    case "script_facts_appear_in_snapshot":
      return {
        key: "script_in_snapshot",
        text: "Every fact your meeting_script cites must also appear in product_snapshot. A fact good enough to say out loud belongs in the list the rep can point at.",
      };

    case "abstention_cites_no_facts":
    case "abstention_snapshot_is_empty":
      return {
        key: "abstention_clean",
        text: "You are abstaining, so the brief cites no product facts at all: product_snapshot must be empty, and objection_response and meeting_script must carry no fact IDs. An abstention with evidence attached is not an abstention.",
      };
    case "abstention_states_a_reason":
      return {
        key: "abstention_reason",
        text: "You are abstaining, so abstention_reason must say plainly what the supplied facts cannot answer and that the rep should route the question to a human.",
      };

    default:
      return null;
  }
}

/** The prohibition codes, each named so the model knows which sentence to cut. */
function prohibitedInstruction(code: string): Instruction | null {
  const text: Record<string, string> = {
    guaranteed_turnaround:
      "Your prose promises a turnaround. Turnaround is a typical expectation and never a guarantee, a promise, or a service-level agreement. Say what the fact says.",
    unsupported_superiority:
      "Your prose makes a comparative or superlative claim (better, faster, broader, largest, most comprehensive). No supplied fact supports a comparison. State the capability on its own terms.",
    competitor_assertion:
      "Your prose names or characterizes a competitor. Never mention one. Speak only about Tempus products.",
    drug_approval_claim:
      "Your prose implies a therapy approval or a therapy-efficacy claim. The supplied facts describe Tempus assays and nothing else: they contain no approvals, no guideline changes, and no drug outcomes, so there is nothing here you could ground such a claim in. Remove it.",
    clinical_recommendation:
      "Your prose tells the physician what to do for a patient. This is a sales conversation, not clinical advice. Remove the recommendation.",
    pricing_or_coverage_claim:
      "Your prose asserts a price, a cost, or that something is covered. The supplied facts contain no pricing or payer-coverage information at all, so there is nothing here you can ground such a claim in. You may name the topic in order to decline it; you may not answer it.",
  };

  return code in text ? { key: `prohibited:${code}`, text: text[code]! } : null;
}

/**
 * The failed checks, as instructions, deduplicated and ordered as the validator reported them.
 *
 * Exported because the eval and the tests need to assert that every code the validator can emit
 * produces something the model can act on.
 */
export function explainFailures(failures: readonly string[]): string[] {
  const instructions = new Map<string, string>();

  for (const code of failures) {
    const instruction = instructionFor(code);
    // A detail code shares its key with the generic check it elaborates, so it overwrites the
    // generic line rather than appending a second, vaguer one beside it.
    if (instruction) instructions.set(instruction.key, instruction.text);
  }

  return [...instructions.values()];
}

/**
 * The repair prompt: the original context, plus the rejected draft and what was wrong with it.
 *
 * The system half is unchanged -- the rules did not move, the model broke one -- and the entire
 * original user half is preserved, because the repair needs the same CRM note and the same facts
 * it had the first time. Only the draft and the failures are new.
 */
export function buildRepairPrompt(base: BuiltPrompt, rejected: ModelBrief, failures: readonly string[]): BuiltPrompt {
  const instructions = explainFailures(failures);

  // A draft with no actionable instruction should never have reached this function: getBrief only
  // repairs a brief the validator rejected, and every code it can emit has an instruction. If that
  // ever stops being true, repairing with an empty complaint would just burn a call.
  if (instructions.length === 0) {
    throw new Error(`No repair instruction exists for any of: ${failures.join(", ")}`);
  }

  const draft = fenceUntrusted(JSON.stringify(rejected, null, 2));

  return {
    ...base,
    user: [
      base.user,
      "",
      "---",
      "",
      "## Correction required",
      "",
      "You returned the draft below. It was rejected by the grounding validator, so no part of it",
      "reached the rep. Nothing about the task has changed: same physician, same CRM note, same facts.",
      "",
      "<rejected_draft>",
      draft,
      "</rejected_draft>",
      "",
      "These checks failed:",
      "",
      ...instructions.map((instruction) => `- ${instruction}`),
      "",
      "Return a corrected brief in the same schema. Keep everything the validator did not object to:",
      "the draft was close enough to be worth repairing, and rewriting the parts that were already",
      "grounded only risks breaking them. Fix what is listed and nothing else.",
      "",
      "Do not satisfy a check by inventing evidence. If the honest fix for a failure is to say less,",
      'say less. If no supplied fact answers the physician\'s concern, return grounding_status "abstain".',
    ].join("\n"),
  };
}
