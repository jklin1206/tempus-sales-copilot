# Tempus Sales Copilot (prototype)

A meeting-preparation workspace for a Tempus territory sales representative.

One workflow: **ranked territory → select an oncologist → get a grounded brief.**

Every product claim in that brief is verified against a sourced fact before it renders.
If a claim cannot be verified, the whole brief is discarded rather than shown.
If the physician's concern is one the approved facts cannot answer, the copilot says so instead of reaching for something adjacent.

It is a **bounded grounded-generation workflow**, not an agent.
The steps are fixed and written in code.
The model chooses the words and never the control flow: it cannot pick a tool, run a search, take an action, or decide to try again.

---

## Assumptions

These are the things you have to accept for the rest of the repo to make sense.
Each one is a judgment call, not a fact handed to us.

**1. "Provider" means the oncologist, not the institution.**
The case study supplies a provider list, and in healthcare that word means the clinician.
The meeting this product prepares you for is a meeting with an oncologist, or with a chief medical officer, and those are the target audience.
`oncologistName` carries the person and `providerOrg` carries the institution, so the two never blur.

**2. The supplied data cannot answer "why now," and I chose not to invent it.**
The case study asks "Why Tempus, why now?".
The three supplied inputs are all *timeless*: market volume, product capability, and a CRM snapshot have no date on which anything changed, so none of them can answer the second half of that question.
An earlier version faked it from a CRM `next_action_date`, which is a scheduling cue and not a market event, and it was removed.

**A real "why now" requires a governed, dated catalyst feed** (approvals, guideline changes, publications, launches) with each event carrying a curated link to the approved claim that lets Tempus speak to it.
That is a data and governance problem before it is a model problem, and it is described in `SPEC.md` §17 as the single highest-value production addition.
Manufacturing urgency out of the data on hand would have demoed well and been the only untrue thing in the product, so the prompt forbids it and the eval asserts that none appears.

**3. The prototype begins after ingestion.**
The market CSV, CRM notes, and product vault are versioned snapshots committed to this repo.
Salesforce integration, live scraping, a database, and webhooks are out of scope and are not simulated.

**4. `likely_patient_population` is a directional proxy and nothing more.**
It orders the territory list.
It is not conversion probability, revenue, product fit, or clinical suitability, and it never influences which product a brief discusses.

**5. Everything is fictional and PHI-free.**
This is a sales-preparation aid, not clinical decision support and not medical advice.
Product facts are curated from public Tempus pages and have not been through medical, legal, or regulatory review.

---

## Tradeoffs

Every row is a decision that could have gone the other way, and the right-hand column is what it costs.

| Decision | What we chose | What it costs |
|---|---|---|
| A brief fails validation | **Discard all of it.** Blocking the pitch means blocking every sentence of it. | The rep sometimes gets an error instead of a brief. |
| No API key configured | **Demo mode is a mode, not a fallback.** You opt in by not setting a key. A *live* failure is reported as a failure. | A live outage shows a red box where a prerecorded brief would have looked fine. |
| Who checks grounding | **A mechanical validator, not an LLM judge.** A model checking a model gives you two things that can hallucinate instead of one. | Brittle string rules. Four separate times the harness was wrong and the model was right (see `prompts/CHANGELOG.md`). |
| A rejected draft | **One repair call, shown exactly which checks failed.** Not a redraw: a redraw learns nothing. | One extra call of latency on the path where a rep is waiting. |
| Retrieval | **None. The whole vault goes in every request.** 34 facts fit, and a retriever that drops the one fact that mattered is worse than no retriever. | Does not scale past a few hundred facts. `KnowledgeProvider` is the seam where an indexed one would go. |
| Caching | **None. Opening a provider generates.** | Latency on every open, in exchange for never showing prose written minutes ago as though it were written now. |
| Ranking | **A plain sort by population.** No model, no embedding, no weighted score. | Crude. It is also the only thing the supplied data actually supports. |
| "Why now" | **Absent, and said so out loud.** It needs a governed catalyst feed the data does not have. | The brief cannot give a rep a dated reason to call today. An invented one would have been worse. |
| What reaches the browser | **Finished prose, a provenance label, and one source link per cited claim.** No fact IDs, no vault, no validation trace. | The rep cannot audit the grounding. That is deliberate: grounding is a guarantee the system makes, not homework it hands the rep. |
| Pricing and reimbursement questions | **Abstain and route to a human.** The vault contains no pricing or payer fact at all. | The copilot cannot answer the single most common objection in the CRM notes. It says so. |
| Model providers | **One (Google Gemini).** A second adapter existed, was never a fallback, and was removed. | Nothing. The `ModelProvider` seam stays, so vendor quirks live in the adapter. |
| Rate limiting | **An in-memory counter.** Adequate to stop a hot-reload loop from draining a demo key. | It does not hold across serverless instances. The real backstop is a spend cap on the key. |

---

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

**It works with no API key.**
The app runs in demo mode, every provider opens a bundled brief labeled "Prerecorded," and the whole workflow is reviewable without credentials.
Those bundled briefs are real recorded model output that passed the same validator the live path runs.
None is hand-written.

For live generation, copy `.env.example` to `.env` and set a key:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=...
GOOGLE_GENERATIVE_AI_MODEL=gemini-3.1-flash-lite
```

The key is read only by server code, is never named `NEXT_PUBLIC_*`, and `.env` is gitignored.

## Verify it

```bash
npm test               # unit and contract tests
npm run eval           # golden scenarios + deterministic checks
npm run build          # production build
```

`npm run eval` evaluates the bundled briefs in demo mode, and live generation when a key is set.
Add `--live` to require a live model (it fails rather than falling back), or `--live --product` to allow the one repair pass a rep actually gets.

Both numbers are worth reporting.
Single-shot is what the prompt earns on its own and it is the number that moves when the prompt improves.
The repaired number is what a rep actually experiences.
Quoting only the second would flatter the prompt.

`prompts/CHANGELOG.md` records the prompt iteration honestly, including the rounds where the harness was wrong and the model was right.

## How it works

```
POST /api/brief
  1. Reject unknown physician IDs before anything touches the filesystem.
  2. Demo mode? Serve the bundled brief and stop.
  3. Load exactly one CRM note + the complete vault.
  4. One structured model call.
  5. Blocking validation.
  6. Rejected? One repair call, shown the failed checks. Validate again.
  7. Still rejected? Every field emptied, and the rep is told.
```

A brief passes three independent contracts on the way out:

| Gate | Where | Question |
|---|---|---|
| **Structure** | `brief/schema.ts` | Is it the right shape? Enforced on the model by JSON schema. |
| **Truth** | `validation/validate.ts` | Is it true, against this physician's CRM note and the vault? |
| **Exposure** | `toClientBrief()` | Is the browser allowed to see it? |

A brief can be perfectly shaped and wholly fabricated, which is why the second gate exists and why it is mechanical.
It checks that every cited fact exists in the vault; that the CRM excerpt is a verbatim substring of *that* physician's note; that every number traces to a cited fact; that required qualifiers survive ("typically", "retrospective"); and that no guaranteed turnaround, competitor, superiority, drug-approval, clinical, or pricing claim appears.

## Layout

```text
data/market/providers.csv      8 fictional oncologists: id, name, org, population
data/crm/*.md                  8 PHI-free CRM notes
knowledge-vault/Products/      34 sourced facts across 4 product notes
prompts/                       meeting-prep-v1..v4 and the refinement log
fixtures/briefs/               one recorded, validated brief per provider (demo mode only)
src/lib/brief/generate.ts      the workflow: draft, validate, repair once, or block
src/lib/generation/repair.ts   failure codes to instructions the model can act on
src/lib/validation/            the blocking validator
src/lib/generation/            the prompt, the repair pass, the Gemini adapter
src/lib/knowledge/             the KnowledgeProvider seam
src/lib/mode.ts                live vs demo, and why it is a mode and not a fallback
evals/                         golden scenarios and the harness
research/                      the source inventory (not loaded at runtime)
```

`SPEC.md` is the full specification.
Section 0 explains what was removed and why, which is the main product judgment in this project.
