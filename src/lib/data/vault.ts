import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { VAULT_DIR } from "./paths";
import { isProductId, type ProductFact, type ProductId } from "../types";

/**
 * Product knowledge vault loader (SPEC.md 6.3).
 *
 * The vault owns neutral Tempus facts and their sources. It owns no physician
 * tailoring, rank, or pitch, and it carries no objection-to-fact mapping: choosing
 * which fact answers a concern is the model's job, checked by the validator.
 *
 * The whole vault is small enough to send in one request, so there is no retriever
 * here and no retrieval miss to design around (SPEC.md 8.3).
 */

/** Fact heading: `### \`fact-id\`` */
const FACT_HEADING = /^###\s+`([a-z0-9-]+)`\s*$/;
/** Field bullet: `- Key: value` */
const FIELD_BULLET = /^-\s+([A-Za-z][A-Za-z ]*?):\s*(.*)$/;

const REQUIRED_FIELDS = ["Product", "Fact", "Qualifiers", "Constraints", "Source", "Source section", "Retrieved"];

function parseVaultNote(fileName: string, raw: string): ProductFact[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const facts: ProductFact[] = [];

  let currentId: string | null = null;
  let fields: Record<string, string> = {};

  const flush = () => {
    if (currentId === null) return;

    const missing = REQUIRED_FIELDS.filter((field) => fields[field] === undefined);
    if (missing.length > 0) {
      throw new Error(`Vault fact ${currentId} in ${fileName} is missing required field(s): ${missing.join(", ")}`);
    }

    const productIds = splitList(fields["Product"] ?? "").map((value) => {
      if (!isProductId(value)) {
        throw new Error(`Vault fact ${currentId} in ${fileName} references unknown product ID "${value}"`);
      }
      return value satisfies ProductId;
    });

    if (productIds.length === 0) {
      throw new Error(`Vault fact ${currentId} in ${fileName} lists no product`);
    }

    const qualifiersRaw = (fields["Qualifiers"] ?? "").trim();
    // "none" is an explicit assertion that the fact needs no preserved qualifier,
    // which is different from an author forgetting the field.
    //
    // Qualifiers are comma separated. A single qualifier may offer alternates with "|",
    // and any one of them satisfies it. A required qualifier is a CONCEPT that must
    // survive, not one blessed spelling of it: "more than 100" and "over 100" say the
    // same thing, and blocking a brief for choosing the second is the validator being
    // pedantic rather than careful.
    const qualifiers =
      qualifiersRaw.toLowerCase() === "none"
        ? []
        : splitList(qualifiersRaw).map((term) =>
            term
              .split("|")
              .map((alt) => alt.trim())
              .filter(Boolean),
          );

    facts.push({
      factId: currentId,
      productIds,
      fact: (fields["Fact"] ?? "").trim(),
      qualifiers,
      measurement: fields["Measurement"]?.trim() || null,
      timingAnchor: fields["Timing anchor"]?.trim() || null,
      constraints: (fields["Constraints"] ?? "").trim(),
      sourceUrl: (fields["Source"] ?? "").trim(),
      sourceSection: (fields["Source section"] ?? "").trim(),
      retrieved: (fields["Retrieved"] ?? "").trim(),
      sourceFile: fileName,
    });

    currentId = null;
    fields = {};
  };

  for (const line of lines) {
    const heading = FACT_HEADING.exec(line);
    if (heading) {
      flush();
      currentId = heading[1] ?? null;
      continue;
    }

    // A non-fact heading (e.g. "## Turnaround") ends the current fact block.
    if (line.startsWith("#")) {
      flush();
      continue;
    }

    if (currentId !== null) {
      const bullet = FIELD_BULLET.exec(line);
      if (bullet && bullet[1] !== undefined) {
        fields[bullet[1].trim()] = bullet[2] ?? "";
      }
    }
  }
  flush();

  return facts;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

let cached: ProductFact[] | null = null;

/** Loads every runtime fact across all vault notes, sorted by fact ID for stable output. */
export function loadVaultFacts(): ProductFact[] {
  if (cached) return cached;

  const files = readdirSync(VAULT_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    throw new Error(`Runtime knowledge vault is empty at ${VAULT_DIR}`);
  }

  const facts: ProductFact[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const raw = readFileSync(join(VAULT_DIR, file), "utf8");
    for (const fact of parseVaultNote(file, raw)) {
      if (seen.has(fact.factId)) {
        throw new Error(`Duplicate fact ID "${fact.factId}" found in ${file}. Fact IDs must be unique across the vault.`);
      }
      seen.add(fact.factId);
      facts.push(fact);
    }
  }

  cached = facts;
  return facts;
}

/** Indexes the vault by fact ID so the validator can check citations in constant time. */
export function loadVaultIndex(): Map<string, ProductFact> {
  return new Map(loadVaultFacts().map((fact) => [fact.factId, fact]));
}
