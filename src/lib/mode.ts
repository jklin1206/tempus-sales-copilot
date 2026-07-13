import "server-only";

import { hasApiKey } from "./generation/providers";

/**
 * Run mode (SPEC.md 13).
 *
 * Two modes, and the boundary between them is absolute.
 *
 *   live — a model key is configured. Every brief is generated, now, by the model. If the
 *          model is down, or the validator blocks what it wrote, the rep is told that. A
 *          bundled brief is never substituted.
 *   demo — no model key is configured. Every brief is a bundled recording, labeled as one,
 *          on every surface. Nothing pretends to be live.
 *
 * This used to be a fallback rather than a mode: with a key set, a provider outage or a
 * validator rejection quietly served the prerecorded brief instead. It was well-intentioned
 * (a correct brief beats a red box) and it was wrong. It meant the one state where the system
 * had failed was the state where it looked most like it was working, and a rep could take a
 * brief into a meeting believing the model had just written it for this physician. A demo mode
 * you opt into by not setting a key is honest. A demo mode you fall into because production
 * broke is a lie with a good excuse.
 *
 * So the fallback is gone and the mode is explicit. Failure in live mode is visible.
 */

export type RunMode = "live" | "demo";

export function runMode(): RunMode {
  return hasApiKey() ? "live" : "demo";
}
