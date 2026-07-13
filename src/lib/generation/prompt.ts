import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PROMPTS_DIR } from "../data/paths";
import { PROMPT_VERSION } from "../versions";
import type { KnowledgeContext } from "../knowledge/provider";
import type { Provider } from "../types";

/**
 * Context builder (SPEC.md 8.1).
 *
 * Builds a bounded context package from exactly:
 *   selected market row + that physician's CRM note + the complete vault + schema.
 *
 * No other physician's CRM text can enter this package, because the caller passes a
 * single joined Provider and there is no path here that reads a second note.
 */

export interface BuiltPrompt {
  system: string;
  user: string;
  promptVersion: string;
}

/** Splits the versioned prompt file into its system and user halves. */
function readPromptFile(version: string): { system: string; user: string } {
  const raw = readFileSync(join(PROMPTS_DIR, `${version}.md`), "utf8").replace(/\r\n/g, "\n");

  const systemStart = raw.indexOf("\n## System\n");
  const userStart = raw.indexOf("\n## User\n");

  if (systemStart === -1 || userStart === -1 || userStart < systemStart) {
    throw new Error(`Prompt ${version}.md must contain a "## System" section followed by a "## User" section`);
  }

  return {
    system: raw.slice(systemStart + "\n## System\n".length, userStart).trim(),
    user: raw.slice(userStart + "\n## User\n".length).trim(),
  };
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) {
      throw new Error(`Prompt template references {{${key}}}, which the context builder does not supply`);
    }
    return value;
  });
}

/**
 * CRM notes are untrusted prose. Neutralizing the delimiter stops a note from closing
 * its own fence and continuing as if it were prompt text (SPEC.md 11.4).
 *
 * The repair pass fences one more thing: the model's own rejected draft, which is prose that
 * a CRM note may have influenced. It gets the same treatment rather than a second copy of the
 * idea, which is why this is exported.
 */
export function fenceUntrusted(text: string): string {
  return text.replace(/<\/?(crm_note|product_facts|rejected_draft|failed_checks)\b[^>]*>/gi, (match) =>
    match.replace(/[<>]/g, ""),
  );
}

export function buildPrompt(provider: Provider, knowledge: KnowledgeContext): BuiltPrompt {
  const { system, user } = readPromptFile(PROMPT_VERSION);

  return {
    system,
    user: fill(user, {
      physician_id: provider.physicianId,
      oncologist_name: provider.oncologistName,
      provider_org: provider.providerOrg,
      likely_patient_population: String(provider.likelyPatientPopulation),
      crm_note: fenceUntrusted(provider.crm.body),
      facts: fenceUntrusted(knowledge.serialized),
      fact_count: String(knowledge.facts.length),
    }),
    promptVersion: PROMPT_VERSION,
  };
}
