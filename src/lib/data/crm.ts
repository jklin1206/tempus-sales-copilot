import "server-only";

import { readFileSync } from "node:fs";
import { z } from "zod";

import { crmNotePath, PHYSICIAN_ID_PATTERN } from "./paths";
import { parseFrontmatter } from "./frontmatter";
import type { CrmNote } from "../types";

/**
 * CRM loader (SPEC.md 6.2).
 *
 * CRM is the only source of physician-specific interest and concern. Exactly one note is
 * loaded per request, by ID, so no other physician's note can enter the model context.
 *
 * The note body is untrusted prose. It is never interpreted here; the generation layer
 * fences it as data.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const crmFrontmatterSchema = z.object({
  physician_id: z.string().regex(PHYSICIAN_ID_PATTERN),
  last_contact: z.string().regex(ISO_DATE, "last_contact must be YYYY-MM-DD"),
});

const cache = new Map<string, CrmNote>();

/**
 * Loads exactly one CRM note.
 *
 * Throws when the note is missing or its physician_id disagrees with the requested ID,
 * because a silent mismatch is how one physician's note ends up in another's brief.
 */
export function loadCrmNote(physicianId: string): CrmNote {
  const hit = cache.get(physicianId);
  if (hit) return hit;

  const path = crmNotePath(physicianId);

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`No CRM note found for ${physicianId}`);
  }

  const { fields, body } = parseFrontmatter(raw, `CRM note ${physicianId}`);
  const parsed = crmFrontmatterSchema.safeParse(fields);
  if (!parsed.success) {
    throw new Error(
      `CRM note ${physicianId} has invalid frontmatter: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
    );
  }

  if (parsed.data.physician_id !== physicianId) {
    throw new Error(
      `CRM note ${physicianId}.md declares physician_id "${parsed.data.physician_id}". Refusing to load a mismatched note.`,
    );
  }

  const note: CrmNote = {
    physicianId,
    lastContact: parsed.data.last_contact,
    // Preserved byte-for-byte: the generated CRM excerpt is validated as an exact
    // substring of this string, so any normalization here would break grounding.
    body: body.trimEnd(),
  };

  cache.set(physicianId, note);
  return note;
}
