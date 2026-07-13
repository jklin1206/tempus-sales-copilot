import type { ModelBrief } from "../../brief/schema";
import type { BuiltPrompt } from "../prompt";

/**
 * The provider seam.
 *
 * A provider's only job is: take the built prompt, return a schema-valid ModelBrief.
 * Everything downstream of that point is identical whichever provider ran, because there
 * is exactly one factual validator and exactly one brief contract. A second provider must
 * never mean a second pipeline.
 *
 * One implementation ships (./google.ts). The seam is kept because it is what forces the
 * vendor's quirks -- its schema dialect, its retry semantics, its error envelope -- to stay
 * inside the adapter instead of leaking into the workflow.
 */
export interface ModelProvider {
  /** Stable identifier, recorded in the trace so a brief says which model wrote it. */
  readonly id: string;
  /** The model this provider will call, for the trace. */
  modelName(): string;
  /** True when this provider's server-side key is configured. */
  hasApiKey(): boolean;
  /** One structured call. Throws TransientGenerationError for a retryable fault. */
  generate(prompt: BuiltPrompt, signal?: AbortSignal): Promise<ProviderResult>;
}

export interface ProviderResult {
  brief: ModelBrief;
  latencyMs: number;
}

/**
 * The model, not the request, produced something unusable. Worth another draw.
 *
 * `retryAfterMs` carries the provider's own instruction when it gives one. A rate limiter
 * that tells you to wait 38 seconds and gets retried in 400ms is not being retried, it is
 * being hammered.
 */
export class TransientGenerationError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs = 0,
  ) {
    super(message);
    this.name = "TransientGenerationError";
  }
}

/** No key, or the provider is down. Not retryable. */
export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelUnavailableError";
  }
}
