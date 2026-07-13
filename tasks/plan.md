# Implementation Plan — Tempus Sales Copilot

This plan migrates the current Python/Streamlit exploration to the approved
Next.js/Vercel prototype in vertical slices. Complete-vault context is the only
runtime knowledge mode in scope.

## Phase 0 — Lock contracts and migrate inputs

- [ ] Move market data to `data/market/providers.csv` with exactly four fields.
- [ ] Move CRM files to `data/crm/` and add `next_action_date` and
  `next_action_type` frontmatter.
- [ ] Create four neutral notes under `knowledge-vault/Products/`.
- [ ] Curate 25–35 sourced facts with stable IDs, product IDs, qualifiers,
  timing/measurement details, source sections, and retrieval dates.
- [ ] Keep original research under `research/` and exclude it from runtime.
- [ ] Update validation fixtures for exact joins and source completeness.

Checkpoint: eight providers join to eight CRM notes, and every runtime fact has
the required source metadata.

## Phase 1 — Next.js deterministic product skeleton

- [ ] Scaffold Next.js App Router with TypeScript and Zod.
- [ ] Implement typed market, CRM, and Markdown-vault loaders.
- [ ] Implement full territory opportunity ranking.
- [ ] Implement urgency buckets and top-five daily queue ranking.
- [ ] Add unit tests for ties, null dates, overdue actions, and queue cutoff.
- [ ] Build Today, All Providers, Recent Reports, and Sources navigation.
- [ ] Add known-provider combobox and shared provider-detail route.

Checkpoint: selection, ranking, and source inspection work without an LLM.

## Phase 2 — Structured meeting-preparation workflow

- [ ] Define Zod schemas for context, facts, briefs, status, and provenance.
- [ ] Implement `KnowledgeProvider` and `FullVaultKnowledgeProvider`.
- [ ] Implement server-only `POST /api/brief` with exact provider/CRM join.
- [ ] Build one complete-vault structured model call.
- [ ] Require exact CRM excerpt and fact IDs for all product claims.
- [ ] Implement cache key `physician_id + data_version + prompt_version`.
- [ ] Add skeleton/progress, safe error, no-key, and fixture states.

Checkpoint: selecting a provider produces one structured brief or explicit
abstention; there is no chat or second Generate button.

## Phase 3 — Grounding and output validation

- [ ] Validate schema, fact IDs, product IDs, and exact CRM excerpt.
- [ ] Validate numbers, units, ranges, conditions, timing anchors, and
  qualifiers.
- [ ] Block guaranteed turnaround, unsupported comparison, drug-approval,
  clinical recommendation, and superiority claims.
- [ ] Enforce 2–4 snapshot facts, 65–80 script words, and at most two script
  facts.
- [ ] Render grounded, abstain, and validation-failed states.
- [ ] Display observable action/evidence trace without chain-of-thought.

Checkpoint: invalid generated prose never reaches the sales-ready UI.

## Phase 4 — Daily report and reliable demo

- [ ] Generate three clearly labeled saved daily-report fixtures.
- [ ] Include the full ranking and briefs for each report's top five.
- [ ] Add Refresh today's report as a manual cron simulation.
- [ ] Keep live refreshed reports in browser/session state only.
- [ ] Add mock-data, sales-aid, provenance, and non-clinical-use labels.
- [ ] Add simple per-session generation limits/cooldown.

Checkpoint: the core demo works even when the free model is unavailable.

## Phase 5 — Evaluation and prompt iteration

- [ ] Implement eight author-labeled golden scenarios.
- [ ] Add prompt injection, unknown ID, cross-provider leak, fabricated metric,
  dropped qualifier, and competitor-claim adversarial tests.
- [ ] Add optional structured LLM rubric scoring for subjective quality.
- [ ] Manually review and disclose all eight scenario results.
- [ ] Create prompt v1–v3 and record failures and changes in `CHANGELOG.md`.
- [ ] Add `npm run eval` and deployment gate.
- [ ] Run the critical browser flow and accessibility/visual QA.

Checkpoint: `npm test`, `npm run eval`, and `npm run build` pass.

## Phase 6 — Submission

- [ ] Add local, no-key, and hosted access instructions.
- [ ] Deploy one Next.js application to Vercel using server-side secrets.
- [ ] Build the eight-slide deck from `SPEC.md` section 19.
- [ ] Record the 3–5 minute demo including one grounded and one abstention case.
- [ ] Verify that README, slides, video, and product use the same terminology.

## Explicit cuts

- No Python/Streamlit final application or VPS.
- No vector database, embeddings, cosine similarity, or RAG retriever.
- No Agent SDK, tool-using loop, multi-agent runtime, or chatbot.
- No database, authentication, real cron, background queue, or real email.
- No Salesforce, calendar, live scraping, drug approval, or publication feed.
- No CMO/account hierarchy, patient-level recommendation, or PHI.
