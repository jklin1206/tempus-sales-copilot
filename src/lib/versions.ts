/**
 * Versions (SPEC.md 8.3).
 *
 * Every brief records the data and prompt version it was built from. Nothing is cached today --
 * opening a provider generates -- so these invalidate nothing at the moment. They are recorded
 * anyway, because provenance is worth having even when nothing is reused: a brief in a log or a
 * committed fixture should be able to say what it was built from.
 *
 * They stand in for what production would derive from the source snapshots themselves. The market
 * CSV, CRM notes, and product vault are versioned snapshots; in production a Salesforce webhook or
 * an incremental sync would change a source version, and these are what would identify exactly the
 * stored briefs that went stale with it.
 */

/** Bump when data/ or knowledge-vault/ changes in a way that should invalidate briefs. */
export const DATA_VERSION = "2026-07-12";

/** Bump when the prompt file changes. Must match a file in prompts/. */
export const PROMPT_VERSION = "meeting-prep-v4";
