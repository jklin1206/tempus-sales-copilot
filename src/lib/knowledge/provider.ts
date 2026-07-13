import "server-only";

import { loadVaultFacts } from "../data/vault";
import type { ProductFact } from "../types";

/**
 * Knowledge serving boundary (SPEC.md 9.2).
 *
 * The prototype ships one implementation: it sends the complete vault. That is the
 * right call for 34 facts, because it cannot miss a fact, it keeps every qualifier
 * in front of the validator, and it is trivial to explain and evaluate.
 *
 * This interface exists so that decision stays replaceable. A future
 * IndexedKnowledgeProvider can add full-text or hybrid retrieval without changing
 * the brief-generation contract, once a corpus is large enough to justify one.
 * Retrieval is not built now, because there is nothing to retrieve from yet.
 */
export interface KnowledgeContext {
  facts: ProductFact[];
  /** Vault notes the facts came from, recorded in the trace. */
  noteFiles: string[];
  /** The facts as the model sees them, already fenced as untrusted data. */
  serialized: string;
}

export interface KnowledgeProvider {
  getContext(input: { physicianId: string }): Promise<KnowledgeContext>;
}

/** Serializes one fact for the model, carrying everything the validator will check. */
function serializeFact(fact: ProductFact): string {
  const lines = [
    `- fact_id: ${fact.factId}`,
    `  products: ${fact.productIds.join(", ")}`,
    `  fact: ${fact.fact}`,
    // Each qualifier is shown with its accepted forms, so the model can see that
    // "over 100" satisfies the same requirement as "more than 100".
    `  required_qualifiers: ${
      fact.qualifiers.length > 0
        ? fact.qualifiers.map((alternates) => alternates.join(" OR ")).join("; ")
        : "none"
    }`,
  ];

  if (fact.measurement) lines.push(`  measurement: ${fact.measurement}`);
  if (fact.timingAnchor) lines.push(`  timing_anchor: ${fact.timingAnchor}`);
  lines.push(`  constraints: ${fact.constraints}`);

  return lines.join("\n");
}

export class FullVaultKnowledgeProvider implements KnowledgeProvider {
  async getContext(_input: { physicianId: string }): Promise<KnowledgeContext> {
    // The physician ID is deliberately unused: the same complete vault goes to every
    // request. Nothing about the physician selects, filters, or ranks the facts, so
    // there is no retrieval step that could quietly drop the one fact that mattered.
    const facts = loadVaultFacts();

    return {
      facts,
      noteFiles: [...new Set(facts.map((fact) => fact.sourceFile))].sort(),
      serialized: facts.map(serializeFact).join("\n\n"),
    };
  }
}
