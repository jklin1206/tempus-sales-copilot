import "server-only";

import { BRIEF_JSON_SCHEMA } from "./schema";
import { parseBrief } from "./parse";
import { ModelUnavailableError, TransientGenerationError, type ModelProvider, type ProviderResult } from "./types";
import type { BuiltPrompt } from "../prompt";

/**
 * Google Gemini. The only provider.
 *
 * Uses `responseMimeType: application/json` with a `responseSchema`, so the model is held to
 * the brief contract at the API rather than by asking the prompt nicely. The parsed result is
 * then re-validated by Zod and handed to the factual validator, because structured output
 * guarantees a shape and says nothing at all about whether the contents are true.
 *
 * Gemini's schema dialect is a subset of JSON Schema: it does not accept
 * `additionalProperties`, so that key is stripped rather than sent.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.1-flash-lite";

/** Gemini rejects `additionalProperties`. Everything else in our schema it accepts. */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node === null || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "additionalProperties") continue;
    out[key] = toGeminiSchema(value);
  }
  return out;
}

export const googleProvider: ModelProvider = {
  id: "google",

  modelName() {
    return process.env.GOOGLE_GENERATIVE_AI_MODEL ?? DEFAULT_MODEL;
  },

  hasApiKey() {
    return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  },

  async generate(prompt: BuiltPrompt, signal?: AbortSignal): Promise<ProviderResult> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new ModelUnavailableError("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");

    const model = this.modelName();
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          // Header, not a query parameter: a key in a URL ends up in access logs.
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt.system }] },
          contents: [{ role: "user", parts: [{ text: prompt.user }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: toGeminiSchema(BRIEF_JSON_SCHEMA),
          },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw new ModelUnavailableError(`Could not reach Google: ${(error as Error).message}`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");

      if (response.status === 429 || response.status >= 500) {
        // A 429 is two different failures wearing the same status code, and telling them apart
        // is the whole point of this branch.
        //
        // A PER-MINUTE limit is transient: Gemini says "wait 38s" and the identical call then
        // succeeds. Waiting is the correct response, and the error body carries a RetryInfo with
        // a retryDelay to wait for. The header is checked first because a proxy may set it instead.
        //
        // A PER-DAY quota is not transient in any useful sense. The free tier allows 500 requests
        // per model per day, and when that is gone it is gone until midnight Pacific. Google still
        // returns a retryDelay (35s, 59s), and honoring it is actively harmful: the caller sleeps
        // a minute, retries, gets the same 429, sleeps again, and the request dies of a function
        // timeout instead of telling anyone what went wrong. That is exactly how a spent quota came
        // to look like a broken API key.
        //
        // So the day quota is reported as unavailable, not retried, and it says what it is.
        const quotaId = /"quotaId"\s*:\s*"([^"]+)"/.exec(detail)?.[1] ?? "";

        if (/PerDay/i.test(quotaId)) {
          throw new ModelUnavailableError(
            "Google's free-tier daily quota for this model is exhausted (500 requests per day). " +
              "It resets at midnight Pacific. Enable billing on the API project, or use demo mode until then.",
          );
        }

        const headerSeconds = Number(response.headers.get("retry-after"));
        const bodySeconds = Number(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(detail)?.[1]);
        const retryAfterMs = (headerSeconds || bodySeconds || 0) * 1000;

        throw new TransientGenerationError(
          `Google returned ${response.status}${retryAfterMs ? ` (retry after ${retryAfterMs / 1000}s)` : ""}.`,
          retryAfterMs,
        );
      }

      throw new ModelUnavailableError(`Google returned ${response.status}: ${detail.slice(0, 200)}`);
    }

    const payload = await response.json();
    const candidate = payload?.candidates?.[0];
    const content = candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";

    if (typeof content !== "string" || content.trim() === "") {
      const reason = candidate?.finishReason ?? "unknown";
      throw new TransientGenerationError(`Google returned an empty response (finishReason: ${reason}).`);
    }

    return { brief: parseBrief(content, "Google"), latencyMs: Date.now() - startedAt };
  },
};
