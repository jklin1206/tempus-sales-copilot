/**
 * Records one bundled brief per physician (SPEC.md 13).
 *
 *   npm run fixtures        (requires a configured AI_PROVIDER key)
 *
 * Every brief written here is REAL model output that passed the same blocking validator the
 * product runs. Nothing is hand-authored: a fixture written by a human and labeled as a
 * recorded generation would be a lie told to the evaluator, and the point of these files is
 * that they are honest.
 *
 * All eight physicians are recorded, not a subset, because every one is reachable from the
 * territory list and from search. Demo mode that covers only some of them leaves a reviewer
 * staring at an empty panel the moment they click the rest.
 *
 * They are labeled `demo_fixture` on load, and the UI never presents one as live.
 */

import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { getBrief } from "../src/lib/brief/generate";
import { hasApiKey, selectProvider } from "../src/lib/generation/providers";
import { loadProviders } from "../src/lib/providers";
import type { Brief } from "../src/lib/brief/schema";

const OUT_DIR = join(process.cwd(), "fixtures", "briefs");

/**
 * How many times the RECORDER will run the product's workflow to get one brief that passes.
 *
 * The product runs the workflow once: one draft, one repair, then it blocks. This script is
 * allowed to run that whole workflow again, because a fixture is a recording and not a
 * measurement: it must be a brief the validator passed, and how many recordings it took to get
 * one says nothing that `npm run eval` does not say better and more honestly.
 *
 * The generosity is deliberately here, in the recorder, and not in `getBrief`, so it cannot leak
 * into what a rep experiences. The eval is pinned to single-shot by default for the same reason.
 */
const RECORDING_ROUNDS = 4;

async function main() {
  if (!hasApiKey()) {
    console.error(
      "\nNo model API key is configured for the selected provider.\n\n" +
        "Fixtures are recorded from real model output, so this will not run without one.\n" +
        "Set AI_PROVIDER and the matching key in .env (see .env.example), then run again.\n",
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const provider = selectProvider();
  const providers = loadProviders();
  const briefs = new Map<string, Brief>();
  const blocked: string[] = [];

  console.log(`\nRecording ${providers.length} briefs via ${provider.id} (${provider.modelName()}).\n`);

  for (const { physicianId } of providers) {
    process.stdout.write(`  ${physicianId} ... `);

    try {
      let brief: Brief | null = null;

      for (let round = 1; round <= RECORDING_ROUNDS; round++) {
        // The full product workflow: one draft, one repair. Never demo mode, or this script
        // would happily "record" the fixture it is supposed to be replacing.
        const candidate = await getBrief(physicianId, { mode: "live", repair: true });
        if (candidate.grounding_status !== "validation_failed") {
          brief = candidate;
          break;
        }
        process.stdout.write(`blocked (${candidate.failure_codes?.join(", ")}), retrying ... `);
      }

      if (!brief) {
        console.log(`BLOCKED after ${RECORDING_ROUNDS} rounds`);
        blocked.push(physicianId);
        continue;
      }

      briefs.set(physicianId, { ...brief, generation_mode: "demo_fixture" });
      console.log(`${brief.grounding_status}, cited ${brief.trace?.cited_fact_ids.length ?? 0} facts`);
    } catch (error) {
      console.log(`ERROR: ${(error as Error).message}`);
      blocked.push(physicianId);
    }
  }

  if (blocked.length > 0) {
    console.error(
      `\nRefusing to write fixtures: ${blocked.length} brief(s) failed validation or errored (${blocked.join(", ")}).\n` +
        "A bundled brief must not be one the product itself would block. Fix the prompt and re-run.\n",
    );
    process.exit(1);
  }

  for (const [physicianId, brief] of [...briefs].sort()) {
    writeFileSync(join(OUT_DIR, `${physicianId}.json`), `${JSON.stringify(brief, null, 2)}\n`);
  }

  console.log(`\nDone. ${briefs.size} briefs recorded to fixtures/briefs/, all validated.\n`);
}

main().catch((error) => {
  console.error(`\nFixture recording failed: ${error.message}\n`);
  process.exit(1);
});
