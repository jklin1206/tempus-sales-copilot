import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { googleProvider } from "@/lib/generation/providers/google";
import { ModelUnavailableError, TransientGenerationError } from "@/lib/generation/providers/types";

/**
 * How the system behaves when Google says 429 (SPEC.md 9.3).
 *
 * This is the failure that made a working API key look like a broken one, so it gets a suite.
 *
 * A 429 is two different failures wearing one status code:
 *
 *   Per-minute limit — transient. Wait the few seconds Gemini asks for and the identical call
 *                      succeeds. Retrying is correct.
 *   Per-day quota    — not transient. The free tier allows 500 requests per model per day, and
 *                      when it is gone it is gone until midnight Pacific. Google still returns a
 *                      retryDelay, and honoring it is actively harmful: sleep 59s, retry, get the
 *                      same 429, sleep again, and die of a function timeout having told nobody
 *                      anything. The rep watches "Preparing brief" forever.
 *
 * Both rules below exist because the second case actually happened in production.
 */

const originalFetch = globalThis.fetch;

/** A Gemini 429 body, shaped exactly like the real one. */
function quotaResponse(quotaId: string, retryDelay = "59s") {
  return new Response(
    JSON.stringify({
      error: {
        code: 429,
        message: "You exceeded your current quota, please check your plan and billing details.",
        details: [
          { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId }] },
          { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay },
        ],
      },
    }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

const prompt = { system: "s", user: "u", promptVersion: "meeting-prep-v4" };

beforeEach(() => {
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("a per-day quota is reported, not retried", () => {
  it("fails as unavailable and names the real cause", async () => {
    globalThis.fetch = vi.fn(async () =>
      quotaResponse("GenerateRequestsPerDayPerProjectPerModel-FreeTier"),
    ) as unknown as typeof fetch;

    await expect(googleProvider.generate(prompt)).rejects.toThrow(ModelUnavailableError);
    await expect(googleProvider.generate(prompt)).rejects.toThrow(/daily quota/i);
  });

  it("does not dress a spent daily quota up as something worth waiting for", async () => {
    globalThis.fetch = vi.fn(async () =>
      quotaResponse("GenerateRequestsPerDayPerProjectPerModel-FreeTier"),
    ) as unknown as typeof fetch;

    // A TransientGenerationError is an instruction to the retry loop to sleep and try again.
    // Sleeping cannot buy back a day quota, so this must not be one.
    await expect(googleProvider.generate(prompt)).rejects.not.toBeInstanceOf(TransientGenerationError);
  });
});

describe("a per-minute limit is still transient", () => {
  it("is retryable, and carries the delay Google asked for", async () => {
    globalThis.fetch = vi.fn(async () =>
      quotaResponse("GenerateRequestsPerMinutePerProjectPerModel-FreeTier", "38s"),
    ) as unknown as typeof fetch;

    await expect(googleProvider.generate(prompt)).rejects.toBeInstanceOf(TransientGenerationError);

    const error = await googleProvider.generate(prompt).catch((e: unknown) => e);
    expect((error as TransientGenerationError).retryAfterMs).toBe(38_000);
  });
});

describe("the retry loop never sleeps past the request's time budget", () => {
  it("fails fast instead of waiting 59 seconds inside a 60-second function", async () => {
    // The bug this pins: honoring a 59s retry-after, three times, inside a route capped at 60s.
    // The function was killed mid-sleep, so the error never reached the rep and the panel just
    // span. Failing fast is worse than a retry that works and far better than a timeout.
    globalThis.fetch = vi.fn(async () =>
      quotaResponse("GenerateRequestsPerMinutePerProjectPerModel-FreeTier", "59s"),
    ) as unknown as typeof fetch;

    const { generateBrief } = await import("@/lib/generation/providers");

    const started = Date.now();
    const error = await generateBrief(prompt).catch((e: unknown) => e);
    const elapsed = Date.now() - started;

    expect(error).toBeInstanceOf(ModelUnavailableError);
    expect((error as Error).message).toMatch(/rate limited/i);

    // It must have declined to sleep at all, rather than burning the budget first.
    expect(elapsed).toBeLessThan(2_000);
  });
});
