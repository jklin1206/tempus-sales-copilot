import "server-only";

import { modelBriefSchema } from "../../brief/schema";
import { TransientGenerationError } from "./types";

/**
 * JSON parse, then Zod. Zod, not the provider, is the decider.
 *
 * A provider's structured-output mode is a strong hint and nothing more. Whatever the vendor
 * claims to have enforced, the brief is re-validated here against the same `modelBriefSchema`
 * the rest of the pipeline is written against, so a provider that quietly relaxes its own
 * schema cannot widen what counts as a valid brief.
 *
 * A parse failure is transient, not fatal: the model produced an unusable sample, and the
 * identical call usually succeeds. See the retry in ./index.ts.
 */
export function parseBrief(content: string, providerLabel: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new TransientGenerationError(`${providerLabel} returned output that is not valid JSON.`);
  }

  const result = modelBriefSchema.safeParse(parsed);
  if (!result.success) {
    throw new TransientGenerationError(
      `${providerLabel} output failed schema validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  return result.data;
}
