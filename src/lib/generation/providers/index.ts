import "server-only";

import { googleProvider } from "./google";
import { ModelUnavailableError, TransientGenerationError, type ModelProvider, type ProviderResult } from "./types";
import type { BuiltPrompt } from "../prompt";

export { ModelUnavailableError, TransientGenerationError };
export type { ModelProvider, ProviderResult };

/**
 * Provider selection.
 *
 * There is one provider, and this returns it. The `ModelProvider` seam in ./types.ts is what
 * makes that a one-line decision rather than a rewrite: a provider's only job is to turn a
 * built prompt into a schema-valid ModelBrief, and everything downstream of that point is
 * identical whichever one ran, because there is exactly one brief contract and exactly one
 * factual validator.
 *
 * A second provider lived here and was removed. It could be selected with an env var, but it
 * was never a fallback -- nothing failed over to it -- so it bought an alternative nobody was
 * choosing at the cost of a registry, an env var, and a second set of quirks to keep working.
 */

export function selectProvider(): ModelProvider {
  return googleProvider;
}

/** True when the provider has a key. False means demo mode: see src/lib/mode.ts. */
export function hasApiKey(): boolean {
  return selectProvider().hasApiKey();
}

/**
 * One structured call, with a bounded retry.
 *
 * A provider fails its own schema check now and then. That is a transient generation
 * fault, not a bad request: the identical call usually succeeds. Retrying it is not the
 * same as retrying a brief the *validator* rejected, which is handled a level up.
 */
const MAX_ATTEMPTS = 3;

/**
 * How long this loop may spend ASLEEP, in total, across all its retries.
 *
 * A retry policy has to fit inside the time budget of the thing calling it. This one did not.
 * The route is capped at 60 seconds (`maxDuration`); a rate-limited Gemini asks for a 59-second
 * wait; and this loop honored that up to three times. So a single rate-limited request would sleep
 * for the better part of three minutes inside a function that is killed at one, and the rep sat
 * watching "Preparing brief" until the whole thing timed out. It never got to report the error,
 * because it never got to finish waiting.
 *
 * That is a worse failure than not retrying at all. Waiting is only worth it if there is time left
 * to use the answer, so a delay that does not fit in the budget is not honored: the call fails
 * fast and says it was rate limited, which is a thing a person can act on.
 *
 * Generation itself takes a few seconds, and a rejected draft costs another call for the repair,
 * so the sleeping budget is deliberately a small fraction of the route's 60.
 */
const RETRY_SLEEP_BUDGET_MS = 12_000;

export async function generateBrief(prompt: BuiltPrompt, signal?: AbortSignal): Promise<ProviderResult & { provider: string; model: string }> {
  const provider = selectProvider();
  let lastError: Error | null = null;
  let sleptMs = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await provider.generate(prompt, signal);
      return { ...result, provider: provider.id, model: provider.modelName() };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      if (!(error instanceof TransientGenerationError)) throw error;

      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        // Wait as long as the provider asked, or back off exponentially when it did not say.
        const backoffMs = Math.max(error.retryAfterMs, 500 * 2 ** (attempt - 1));

        if (sleptMs + backoffMs > RETRY_SLEEP_BUDGET_MS) {
          throw new ModelUnavailableError(
            `${provider.id} is rate limited and asked to be retried in ${Math.round(backoffMs / 1000)}s, ` +
              "which is longer than this request can wait. Try again in a minute.",
          );
        }

        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        sleptMs += backoffMs;
      }
    }
  }

  throw new ModelUnavailableError(
    `${provider.id} failed to produce a schema-valid brief after ${MAX_ATTEMPTS} attempts. ${lastError?.message ?? ""}`,
  );
}
