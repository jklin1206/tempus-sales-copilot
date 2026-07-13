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

## What it looks like

**The territory.** One ranking, honestly described. Sorted by `likely_patient_population` descending, physician ID as the tie-break. That is the whole algorithm: no model, no score, no similarity.

![The ranked territory](deck/assets/01-territory-crop.png)

**A grounded brief.** Every talking point links to the Tempus page it came from. The objection handler answers the physician's actual question, and the script is held to 65-80 words.

Note the sentence the model wrote unprompted: *"This is a typical expectation and not a guaranteed turnaround or a service-level agreement."* The validator requires the qualifier "typically" to survive from the source fact into the prose. It does not require that disclaimer. The model added it, and the system let it through because it is true.

![A grounded brief for Dr. Chen](deck/assets/02-chen-objection.png)

**The abstention.** Dr. Ruiz asks about out-of-pocket cost and reimbursement. The copilot declines and routes to a human.

That is not a special case in the prompt. The runtime vault contains **no pricing or payer-coverage fact at all**, because those require approved internal sources. Nothing in it *can* answer a cost question, so the honest answer is the only available one. A test asserts no such fact is ever added.

![The abstention for Dr. Ruiz](deck/assets/03-ruiz-crop.png)

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

> The Gemini free tier allows **500 requests per model per day**. A few full eval runs will spend it. When it runs out the app says so plainly rather than hanging: a per-day quota is reported as unavailable, not retried, because no amount of waiting buys it back.

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
That is a data and governance problem before it is a model problem, and `SPEC.md` §17 describes it as the single highest-value production addition.
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

## The biggest tradeoff: no retrieval, no RAG

**The entire knowledge base is sent on every request. There is no retriever, no embedding, no vector index, and no similarity search.**

This is the decision most likely to be read as a gap, so it is worth being precise: it is a deliberate tradeoff, and at this data size retrieval would make the product *worse*, not better.

**The corpus fits.** All 34 facts, plus the physician's CRM note and the schema, come to roughly **6,500 tokens** in a single prompt. That is comfortably inside the model's context window with room to spare. There is nothing to retrieve *from*: retrieval solves the problem of a corpus too large to send, and this corpus is not.

**Retrieval would add a failure mode we currently do not have.** A retriever's job is to decide which facts the model never sees. Get that wrong once and the brief is missing the one fact that answered the physician's question, and no amount of downstream validation can recover it, because the validator can only check the claims that were made. Today the model sees every approved fact, every time, so a brief that fails to answer a concern is a prompt problem, which is fixable and measurable. It is never a retrieval miss, which is neither.

**It keeps every qualifier in front of the validator.** Grounding here depends on qualifiers surviving from the source fact into the prose ("typically", "retrospective", "identified fusions"). The complete vault is present at validation time, so every cited fact can be compared against its source. Chunking would put that guarantee at the mercy of a chunk boundary.

**It is honest about what the system is.** Calling this RAG would be branding, not architecture. There is no retrieval step to speak of, and claiming one would describe a system that does not exist.

**Where it breaks, and what changes.** This does not scale past a few hundred facts: the prompt gets expensive, the model's attention gets thin, and eventually the corpus stops fitting. That is exactly when retrieval starts paying for itself. `KnowledgeProvider` is the seam it goes behind:

```ts
interface KnowledgeProvider {
  getContext(input: { physicianId: string }): Promise<KnowledgeContext>;
}

class FullVaultKnowledgeProvider implements KnowledgeProvider {}   // today
class IndexedKnowledgeProvider implements KnowledgeProvider {}     // when the corpus needs one
```

The brief-generation contract does not change when that day comes. The retrieval strategy is a swappable implementation detail, which is the point of putting it behind an interface now and building nothing behind it yet.

---

## Other tradeoffs

Each row is a decision that could have gone the other way, and the right-hand column is what it costs.

| Decision | What we chose | What it costs |
|---|---|---|
| A brief fails validation | **Discard all of it.** Blocking the pitch means blocking every sentence of it. | The rep sometimes gets an error instead of a brief. |
| Who checks grounding | **A mechanical validator, not an LLM judge.** A model checking a model gives you two things that can hallucinate instead of one. | Brittle string rules. Four separate times the harness was wrong and the model was right (see `prompts/CHANGELOG.md`). |
| A rejected draft | **One repair call, shown exactly which checks failed.** Not a redraw: a redraw runs the same prompt again and learns nothing. | One extra call of latency on the path where a rep is waiting. |
| Ranking | **A plain sort by population.** No model, no embedding, no weighted score. | Crude. It is also the only thing the supplied data actually supports. |
| "Why now" | **Absent, and said so out loud.** It needs a governed catalyst feed the data does not have. | The brief cannot give a rep a dated reason to call today. An invented one would have been worse. |
| Pricing and reimbursement questions | **Abstain and route to a human.** The vault contains no pricing or payer fact at all. | The copilot cannot answer the single most common objection in the CRM notes. It says so. |
| What reaches the browser | **Finished prose, a provenance label, and one source link per cited claim.** No fact IDs, no vault, no validation trace. | The rep cannot audit the grounding. That is deliberate: grounding is a guarantee the system makes, not homework it hands the rep. |
| No API key configured | **Demo mode is a mode, not a fallback.** You opt in by not setting a key. A *live* failure is reported as a failure, never quietly swapped for a recording. | A live outage shows an error where a prerecorded brief would have looked fine. |

Caching, rate limiting, provider adapters, and the ingestion boundary are deliberately not argued here.
They are infrastructure rather than product judgment, and they belong in `SPEC.md` where the production shape is described.

---

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

**The repair pass.** When the validator rejects a draft, the model gets exactly one more call, and it is not a redraw. It is shown the draft that was thrown out and told which checks failed, in language it can act on:

> These numbers appear in your prose and no fact you cited states them: 3. Either cite the fact that does state each number, or remove it.

rather than `numbers_trace_to_cited_facts`. The repaired brief is gated by the identical validator, so a repair that fixes the qualifier and invents a number still fails.

---

## How well it works

Measured on `google` / `gemini-3.1-flash-lite`, the default and only provider.

```bash
npm test               # 116 unit and contract tests
npm run eval           # golden scenarios + deterministic checks
npm run build          # production build
```

| | Result |
|---|---|
| Deterministic checks | **8 / 8** |
| Golden scenarios, single-shot | 7 / 8, 8 / 8, 7 / 8, 8 / 8 |
| Golden scenarios, with the repair pass | **8 / 8** |
| Unit and contract tests | **116** |

Both generation numbers are reported on purpose.
Single-shot is what the prompt earns on its own, and it is the number that moves when the prompt improves.
The second is what a rep actually experiences.
Quoting only the second would flatter the prompt.

`npm run eval` is single-shot by default. Add `--live` to require a live model (it fails rather than falling back to bundled briefs), or `--live --product` to allow the one repair call.

What fails single-shot is almost always a dropped qualifier, a gene count cited without the fact that states it, or a script that lands a few words short.
Those are real defects and the validator is right to catch them.
They could be tuned away by loosening the checks, which would mean shipping the overclaims instead.

`prompts/CHANGELOG.md` records the iteration honestly, including the **four separate times the harness was wrong and the model was right.**

---

## Layout

```text
data/market/providers.csv      8 fictional oncologists: id, name, org, population
data/crm/*.md                  8 PHI-free CRM notes
knowledge-vault/Products/      34 sourced facts across 4 product notes
prompts/                       meeting-prep-v1..v4 and the refinement log
fixtures/briefs/               one recorded, validated brief per provider (demo mode only)
src/lib/brief/generate.ts      the workflow: draft, validate, repair once, or block
src/lib/validation/            the blocking validator
src/lib/generation/repair.ts   failure codes to instructions the model can act on
src/lib/knowledge/             the KnowledgeProvider seam (where retrieval would go)
src/lib/mode.ts                live vs demo, and why it is a mode and not a fallback
evals/                         golden scenarios and the harness
research/                      the source inventory (not loaded at runtime)
deck/                          the walkthrough deck and its screenshots
```

`SPEC.md` is the full specification.
Section 0 explains what was removed and why, which is the main product judgment in this project.

---

## Scope and honesty

- All physicians, organizations, and CRM notes are **fictional** and contain no patient data.
- This is a **sales-preparation aid**, not clinical decision support and not medical advice.
- Product facts are curated from public Tempus pages and have **not** been through medical, legal, or regulatory review.
- Bundled briefs are labeled, appear only in demo mode, and are never presented as live model output or substituted for a live brief that failed.
- The eight golden scenarios are author-labeled regression coverage, not a claim of real-world accuracy.
