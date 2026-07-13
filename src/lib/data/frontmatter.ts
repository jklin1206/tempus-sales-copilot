/**
 * Minimal frontmatter splitter for the flat `key: value` blocks used by CRM notes.
 *
 * The notes are version-controlled fixtures with a fixed shape, so a full YAML
 * parser would be a dependency without a job. Nested structures are not supported
 * on purpose: if a note ever needs one, this should fail loudly rather than guess.
 */
export interface Frontmatter {
  fields: Record<string, string>;
  /** Everything after the closing delimiter, with leading blank lines trimmed. */
  body: string;
}

const DELIMITER = "---";

export function parseFrontmatter(raw: string, label: string): Frontmatter {
  const normalized = raw.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines[0]?.trim() !== DELIMITER) {
    throw new Error(`${label}: expected frontmatter to open with "---"`);
  }

  const closingIndex = lines.indexOf(DELIMITER, 1);
  if (closingIndex === -1) {
    throw new Error(`${label}: frontmatter is never closed with "---"`);
  }

  const fields: Record<string, string> = {};
  for (let i = 1; i < closingIndex; i++) {
    const line = lines[i];
    if (line === undefined || line.trim() === "") continue;

    const separator = line.indexOf(":");
    if (separator === -1) {
      throw new Error(`${label}: frontmatter line ${i + 1} is not "key: value": ${line}`);
    }

    const key = line.slice(0, separator).trim();
    // An empty value is meaningful: it is how a note records "no next action".
    fields[key] = line.slice(separator + 1).trim();
  }

  return {
    fields,
    body: lines.slice(closingIndex + 1).join("\n").replace(/^\n+/, ""),
  };
}
