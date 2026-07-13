import "server-only";

import { briefSchema, type Brief } from "./schema";
import { FullVaultKnowledgeProvider } from "../knowledge/provider";
import { buildPrompt } from "../generation/prompt";
import { buildRepairPrompt } from "../generation/repair";
import { generateBrief as callModel, ModelUnavailableError } from "../generation/providers";
import { validateBrief } from "../validation/validate";
import { findProvider } from "../providers";
import { findFixtureBrief } from "../fixtures";
import { runMode, type RunMode } from "../mode";
import { DATA_VERSION, PROMPT_VERSION } from "../versions";

/**
 * The brief workflow (SPEC.md 9.3).
 *
 * A bounded grounded-generation workflow, not an agent: the steps below are fixed, and the model
 * chooses the words, never the control flow. It cannot pick a tool, run a search, take an action,
 * or decide to try again. Code loads the data, code decides what is grounded, and code decides
 * what the rep sees.
 *
 *   1. Validate that the physician exists.
 *   2. Load exactly one matching CRM note.
 *   3. Load the complete runtime vault.
 *   4. Record data and prompt versions.
 *   5. One structured model call, through the selected provider.
 *   6. Blocking validation.
 *   7. If it was rejected: one repair call, shown the failed checks. Then validate again.
 *   8. Return a grounded result, an explicit abstention, or a visible failure.
 *
 * Shared by the API route, the fixture recorder, and the eval harness, so all three exercise the
 * same path rather than three drifting copies of it.
 *
 * There is no session cache. Opening a provider generates a brief, every time. A cache would have
 * made a second visit instant, but it also meant the rep could be looking at prose written minutes
 * ago while believing it was written now, and the UI then had to explain the difference to them.
 * Generation is a few seconds; the ambiguity was not worth saving them.
 */

export class UnknownPhysicianError extends Error {}

export interface GenerateOptions {
  /**
   * `live` calls the model. `demo` serves the bundled recording. Defaults to `runMode()`, which
   * is `demo` when no model key is configured and `live` when one is.
   *
   * The two never mix. In live mode a failure is reported as a failure; a bundled brief is never
   * quietly substituted for one the model could not produce. See `src/lib/mode.ts`.
   */
  mode?: RunMode;
  /**
   * Whether a rejected draft gets its one repair call (SPEC.md 8.2).
   *
   * The product repairs: a rep is better served by a corrected brief than by a red box, and the
   * validator gates the repair exactly as it gated the draft.
   *
   * The eval pins this off by default, because the single-shot number is the honest measure of the
   * prompt. `npm run eval -- --live --product` turns it on to measure what a rep actually gets.
   * Both numbers are reported in prompts/CHANGELOG.md, because quoting only the repaired one
   * would flatter the prompt.
   */
  repair?: boolean;
  signal?: AbortSignal;
}

export async function getBrief(physicianId: string, options: GenerateOptions = {}): Promise<Brief> {
  // 1. Unknown IDs are rejected before anything touches the filesystem (SPEC.md 11.4).
  const provider = findProvider(physicianId);
  if (!provider) {
    throw new UnknownPhysicianError(`Unknown physician: ${physicianId}`);
  }

  const mode = options.mode ?? runMode();

  // Demo mode is a mode, not a fallback. It is entered by not configuring a key, it applies to
  // every brief, and the UI says so on every surface. Nothing here is ever reached because live
  // generation failed.
  if (mode === "demo") {
    const fixture = findFixtureBrief(physicianId);
    if (fixture) return { ...fixture, generation_mode: "demo_fixture" };

    throw new ModelUnavailableError(
      "This app is in demo mode because no model API key is configured, and no bundled brief exists for this physician.",
    );
  }

  // 2 and 3. Exactly one CRM note; the complete vault.
  const crm = provider.crm;
  const knowledge = await new FullVaultKnowledgeProvider().getContext({ physicianId });
  const context = { provider, crm, facts: knowledge.facts };

  // 4 and 5. One structured call.
  const prompt = buildPrompt(provider, knowledge);
  let result = await callModel(prompt, options.signal);

  // 6. Blocking validation (SPEC.md 11.3). Identical for every provider.
  let validation = validateBrief(result.brief, context);
  let repaired = false;

  // 7. One repair call, shown exactly which checks failed and why. Not a redraw: a redraw runs the
  // same prompt again and learns nothing, and the validator already knows precisely what was wrong.
  if (!validation.ok && (options.repair ?? true)) {
    result = await callModel(buildRepairPrompt(prompt, result.brief, validation.failed), options.signal);
    validation = validateBrief(result.brief, context);
    repaired = true;
  }

  const trace: Brief["trace"] = {
    crm_note_loaded: `data/crm/${physicianId}.md`,
    vault_notes_loaded: knowledge.noteFiles,
    vault_fact_count: knowledge.facts.length,
    cited_fact_ids: validation.citedFactIds,
    checks_passed: validation.passed,
    checks_failed: validation.failed,
    latency_ms: result.latencyMs,
    provider: result.provider,
    model: result.model,
    repaired,
  };

  if (validation.ok) {
    return briefSchema.parse({
      ...result.brief,
      generation_mode: "live_generation",
      prompt_version: PROMPT_VERSION,
      data_version: DATA_VERSION,
      trace,
    } satisfies Brief);
  }

  // 8. The repair was rejected too. Nothing the model wrote survives: blocking the pitch means
  // blocking every sentence of it.
  //
  // The rep is told. There is no bundled brief served here, and there used to be: a blocked live
  // generation quietly became a prerecorded one, labeled "saved demo brief" and otherwise
  // indistinguishable from a working system. That turned the loudest failure the product has into
  // its quietest, and a validator nobody can see firing is a validator nobody maintains.
  return briefSchema.parse({
    physician_id: physicianId,
    grounding_status: "validation_failed",
    product_ids: [],
    why_tempus: "",
    supporting_crm_excerpt: "",
    product_snapshot: [],
    objection_response: { text: "", fact_ids: [] },
    meeting_script: { text: "", fact_ids: [] },
    generation_mode: "live_generation",
    prompt_version: PROMPT_VERSION,
    data_version: DATA_VERSION,
    trace,
    failure_codes: validation.failed,
  } satisfies Brief);
}
