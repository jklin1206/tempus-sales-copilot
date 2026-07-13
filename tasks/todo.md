# Build Checklist — Tempus Sales Copilot

Reconciled with the final product. See `SPEC.md` section 0 for what was cut and why.

## Product shape

- [x] One workflow: ranked territory / search → select oncologist → grounded brief.
- [x] One deterministic ranking: population descending, physician ID as stable tie-break.
- [x] Complete-vault context and one structured LLM call.
- [x] Cut chatbot, Agent SDK, vector RAG, cron, email, and database.
- [x] Cut the daily queue, "Today" framing, urgency ranking, refresh simulation, and report
      history. The data cannot support a credible changing daily queue.
- [x] Cut CRM-derived "Why now", with nothing manufactured in its place.
- [x] Cut the user-facing Sources browser, fact-ID chips, and evidence trace.

## Data

- [x] Eight-row four-column mock market CSV.
- [x] Eight PHI-free CRM notes, with no next-action scheduling field.
- [x] 34 sourced facts across four neutral product notes, one claim per fact.
- [x] No pricing or payer-coverage fact exists, so the abstention is genuine.

## Application

- [x] Typed, Zod-validated loaders and exact provider/CRM joins.
- [x] Opportunity ranking with unit tests.
- [x] Territory workspace, search combobox, provider detail.
- [x] Server-side structured model call behind one provider abstraction (google, groq).
- [x] Caching, provenance, and a bundled brief for every provider.
- [x] Client receives validated prose and a provenance label only.

## Validation and evaluation

- [x] Zod output schema, then blocking factual and safety validation.
- [x] Grounded, abstain, and validation-failed states.
- [x] Golden and adversarial evals, including a manufactured-urgency check.
- [x] Prompts v1–v4 and an honest refinement changelog.
- [x] `npm test`, `npm run eval`, and `npm run build` pass.

## Remaining

- [ ] Deploy to Vercel with server-only keys.
- [ ] Build the eight-slide deck.
- [ ] Record the 3–5 minute demo.
- [x] Measure the eval against `google` / `gemini-3.1-flash-lite`: 7-8/8 single-shot, 8/8 product mode.
      Bundled briefs re-recorded on it. Groq numbers preserved as labeled history.

## Deliberately not done

- [ ] ~~Optional structured LLM grader~~ — the deterministic validator is the gate. A second model
      scoring the first adds something that can hallucinate without adding something that can block.
- [ ] ~~Playwright browser tests~~ — the critical path is verified by hand in the browser.
