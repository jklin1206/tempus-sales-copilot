import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModelUnavailableError } from "@/lib/generation/providers";
import type { ModelBrief } from "@/lib/brief/schema";

/**
 * The live/demo boundary (SPEC.md 13) and the repair pass (SPEC.md 8.2).
 *
 * These two rules are the ones a future change is most likely to quietly undo, because undoing
 * either one makes the demo look better:
 *
 *   1. Live mode never serves a bundled brief. Not when the provider is down, not when the
 *      validator blocks what the model wrote. The version of this product that fell back to a
 *      recording on failure looked flawless and was lying: the state where the system had failed
 *      was the state where it looked most like it was working.
 *   2. A rejected draft gets exactly one repair call. Not five draws, not none.
 *
 * The model is mocked here because that is the only way to force a failure on demand. Everything
 * downstream of it -- the real validator, the real vault, the real CRM notes -- runs for real.
 */

const generateBrief = vi.fn();

vi.mock("@/lib/generation/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/generation/providers")>();
  return { ...actual, generateBrief: (...args: unknown[]) => generateBrief(...args) };
});

const { getBrief } = await import("@/lib/brief/generate");

/** A brief that passes the real validator for p02. */
function validBrief(): ModelBrief {
  return {
    physician_id: "p02",
    grounding_status: "grounded",
    product_ids: ["xf"],
    why_tempus: "Dr. Chen needs blood-based results inside a first-line decision window.",
    supporting_crm_excerpt: "she asked how quickly liquid-biopsy results are typically returned",
    product_snapshot: [
      { fact_id: "xf-turnaround-01", display_text: "xF results are typically expected within 7 days." },
      { fact_id: "xf-identity-01", display_text: "xF is a 105-gene liquid-biopsy ctDNA panel." },
    ],
    objection_response: {
      text: "Results are typically expected within 7 days of specimen retrieval.",
      fact_ids: ["xf-turnaround-01"],
    },
    meeting_script: {
      text: "You mentioned wanting results quickly. xF is a liquid-biopsy panel, and results are typically expected within 7 days of specimen retrieval, which usually lands inside a first-line decision window. It runs from a blood draw, so there is no wait on tissue. If the timing works for your practice, I can walk your team through how ordering fits the workflow you already run today here.",
      fact_ids: ["xf-turnaround-01"],
    },
  };
}

/**
 * The same brief with a fabricated number, which the real validator rejects.
 *
 * 999 rather than a plausible figure on purpose. A number close to a real one could quietly
 * become legal the day someone edits the fact that states it, and this test would then pass
 * while asserting nothing.
 */
function rejectedBrief(): ModelBrief {
  return { ...validBrief(), why_tempus: "xF results are typically expected within 999 days." };
}

const returns = (brief: ModelBrief) => ({ brief, latencyMs: 10, provider: "google", model: "test-model" });

// Block bodies, not expression bodies: `mockReset()` returns the mock, a mock is callable, and
// Vitest treats a function returned from a hook as a teardown callback. It would then CALL the
// mock after each test, which for a mock that throws means the test fails after passing.
beforeEach(() => {
  generateBrief.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("live mode fails visibly and never reaches for a recording", () => {
  it("propagates a provider outage instead of serving the bundled brief", async () => {
    generateBrief.mockImplementation(() => {
      throw new ModelUnavailableError("the provider is down");
    });

    // p02 HAS a bundled brief. That is the point: the fixture is right there, and live mode
    // must not take it.
    await expect(getBrief("p02", { mode: "live" })).rejects.toThrow(ModelUnavailableError);
  });

  it("blocks a brief the validator rejects twice, rather than substituting the bundled one", async () => {
    generateBrief.mockResolvedValue(returns(rejectedBrief()));

    const brief = await getBrief("p02", { mode: "live" });

    expect(brief.grounding_status).toBe("validation_failed");
    expect(brief.generation_mode).toBe("live_generation");
    expect(brief.generation_mode).not.toBe("demo_fixture");

    // Blocking the pitch means blocking every sentence of it.
    expect(brief.why_tempus).toBe("");
    expect(brief.meeting_script.text).toBe("");
    expect(brief.product_snapshot).toEqual([]);
    expect(brief.failure_codes).toContain("numbers_trace_to_cited_facts");
  });
});

describe("one draft, one repair", () => {
  it("returns the first draft when the validator passes it, and makes no second call", async () => {
    generateBrief.mockResolvedValue(returns(validBrief()));

    const brief = await getBrief("p02", { mode: "live" });

    expect(brief.grounding_status).toBe("grounded");
    expect(brief.trace?.repaired).toBe(false);
    expect(generateBrief).toHaveBeenCalledTimes(1);
  });

  it("repairs a rejected draft once, and the repaired brief is the one served", async () => {
    generateBrief
      .mockResolvedValueOnce(returns(rejectedBrief()))
      .mockResolvedValueOnce(returns(validBrief()));

    const brief = await getBrief("p02", { mode: "live" });

    expect(brief.grounding_status).toBe("grounded");
    expect(brief.trace?.repaired).toBe(true);
    expect(generateBrief).toHaveBeenCalledTimes(2);
  });

  it("stops after the repair: two calls, never three", async () => {
    generateBrief.mockResolvedValue(returns(rejectedBrief()));

    await getBrief("p02", { mode: "live" });

    // The five-attempt loop this replaced would have called five times, learned nothing between
    // them, and made a rep wait through all five.
    expect(generateBrief).toHaveBeenCalledTimes(2);
  });

  it("shows the repair call the failed checks, not just the same prompt again", async () => {
    generateBrief
      .mockResolvedValueOnce(returns(rejectedBrief()))
      .mockResolvedValueOnce(returns(validBrief()));

    await getBrief("p02", { mode: "live" });

    const [draftPrompt] = generateBrief.mock.calls[0] as [{ user: string }];
    const [repairPrompt] = generateBrief.mock.calls[1] as [{ user: string }];

    expect(draftPrompt.user).not.toContain("Correction required");
    expect(repairPrompt.user).toContain("Correction required");
    // The specific defect, named: 999 is the number it invented.
    expect(repairPrompt.user).toContain("999");
    expect(repairPrompt.user).toMatch(/no fact you cited states them/i);
  });

  it("takes the single shot and no repair when the eval asks for one", async () => {
    generateBrief.mockResolvedValue(returns(rejectedBrief()));

    const brief = await getBrief("p02", { mode: "live", repair: false });

    expect(brief.grounding_status).toBe("validation_failed");
    expect(generateBrief).toHaveBeenCalledTimes(1);
  });
});

describe("demo mode is a mode, not a fallback", () => {
  it("serves the bundled brief and never calls the model at all", async () => {
    const brief = await getBrief("p02", { mode: "demo" });

    expect(brief.generation_mode).toBe("demo_fixture");
    expect(generateBrief).not.toHaveBeenCalled();
  });

  it("is entered by not configuring a key, and nothing else", async () => {
    const { runMode } = await import("@/lib/mode");

    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    expect(runMode()).toBe("demo");

    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "a-key");
    expect(runMode()).toBe("live");
  });
});
