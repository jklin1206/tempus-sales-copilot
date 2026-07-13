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

export async function generateBrief(prompt: BuiltPrompt, signal?: AbortSignal): Promise<ProviderResult & { provider: string; model: string }> {
  const provider = selectProvider();
  let lastError: Error | null = null;

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
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new ModelUnavailableError(
    `${provider.id} failed to produce a schema-valid brief after ${MAX_ATTEMPTS} attempts. ${lastError?.message ?? ""}`,
  );
}
