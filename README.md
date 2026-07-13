# Tempus Sales Copilot (prototype)

Meeting prep for a Tempus territory sales rep.
**Ranked territory → pick an oncologist → get a grounded brief.**

### ▶ [Live demo](https://tempus-sales-copilot-jklin1206-gmailcoms-projects.vercel.app) · [Deck](deck/tempus-sales-copilot.pdf) · [Spec](SPEC.md) · [Prompt log](prompts/CHANGELOG.md)

Every product claim is checked against a sourced fact before it renders.
If a claim can't be verified, the whole brief is thrown away.
If the approved facts can't answer the physician's question, the copilot says so instead of reaching for something adjacent.

**It's a bounded grounded-generation workflow, not an agent.** The steps are fixed in code; the model chooses words, never control flow.

---

## What it looks like

**The territory.** Sorted by patient population. That's the whole algorithm — no model, no score.

![Ranked territory](deck/assets/01-territory-crop.png)

**A grounded brief.** Each talking point links to the Tempus page it came from. Script held to 65–80 words.

The model added *"a typical expectation and not a guaranteed turnaround"* on its own. The validator only requires "typically" to survive from the source fact — the disclaimer was the model's idea, and it's true, so it stands.

![Grounded brief for Dr. Chen](deck/assets/02-chen-objection.png)

**The abstention.** Dr. Ruiz asks about out-of-pocket cost. The copilot declines and routes to a human.

Not a special case in the prompt — the vault holds **no pricing fact at all**, so nothing in it *can* answer her. A test asserts none is ever added.

![Abstention for Dr. Ruiz](deck/assets/03-ruiz-crop.png)

---

## Assumptions

**1. "Provider" means the oncologist**, not the institution. The meeting is with a doctor or a CMO.

**2. Impact is a magnitude, not a guess.** The brief asks for a list *ordered by impact*. Expected value = **impact × propensity**. The data carries exactly one magnitude — `likely_patient_population` — so that's the sort. It carries no propensity at all: no conversion history, no won/lost, no engagement. So I didn't invent one. ([why not a 1–100 lead score](#why-not-a-sales-potential-score))

**3. The prototype begins after ingestion.** Committed snapshots. No Salesforce sync, no scraping, no database. Production ingestion is described in the spec.

**4. Product facts are public-page only.** So no pricing or coverage fact exists, and a cost question routes to a human. An eval check asserts that gap stays a gap.

**5. Everything is fictional and PHI-free.** A sales aid, not clinical decision support.

---

## Tradeoffs

| Decision | Choice | Cost |
|---|---|---|
| **Retrieval** | **None. The whole vault goes in every request.** | Doesn't scale past a few hundred facts. See below. |
| **A brief fails validation** | **Discard all of it.** Blocking the pitch means blocking every sentence. | The rep sometimes gets an error, not a brief. |
| **Who checks grounding** | **A mechanical validator, not an LLM judge.** A model checking a model gives you two things that can hallucinate. | Brittle string rules. Four times the harness was wrong and the model was right. |
| **A rejected draft** | **One repair call, shown exactly which checks failed.** A redraw learns nothing. | One extra call of latency. |
| **Ranking** | **A plain sort by population.** Impact is a magnitude; it's the only one the data has. | No propensity term — and no data to build one from. |
| **"Why now"** | **Absent, and said so.** It needs a governed catalyst feed the data doesn't have. | No dated reason to call today. An invented one would be worse. |
| **Pricing questions** | **Abstain, route to a human.** | Can't answer the most common objection in the CRM notes. It says so. |
| **What the browser gets** | **Finished prose + one source link per claim.** No fact IDs, no vault, no trace. | The rep can't audit grounding. Deliberate: it's a guarantee, not homework. |
| **No API key** | **Demo mode is a mode, not a fallback.** A live failure is reported as a failure. | An outage shows an error where a recording would have looked fine. |

Caching, rate limiting, and provider adapters are infrastructure, not product judgment. They live in [`SPEC.md`](SPEC.md).

### The big one: RAG's shape, with the retriever left out

**Augmented generation — yes.** The model is grounded in external knowledge read at request time, never in its own weights, and may assert nothing the facts don't support.

**Retrieval — deliberately not.** No embeddings, no similarity, no top-k. All 34 facts go in every request.

At this size, retrieve-everything **strictly dominates** a retriever:

- **The corpus fits.** 34 facts + the CRM note ≈ 6,500 tokens. Retrieval solves "too big to send." This isn't.
- **Perfect recall, by construction.** A retriever decides which facts the model *never sees*. Miss once and the brief is missing the fact that answered the question — and no validator can catch that, because it only checks claims that were *made*.
- **Qualifiers stay in front of the validator.** Grounding depends on words like *typically* surviving into the prose. Chunking puts that at the mercy of a chunk boundary.

It stops dominating past a few hundred facts. `KnowledgeProvider` is the seam a real retriever slots behind — the brief contract, validator, and evals don't move.

The *R* is the one piece of RAG this doesn't need yet, so it's the one piece that isn't built.

### <a name="why-not-a-sales-potential-score"></a>Why not a "sales potential score"

A 1–100 score blending population with CRM sentiment ("dissatisfied with turnaround → hotter lead") is answering **propensity**, not impact — a buying-readiness proxy wearing an impact label.

It also can't be calibrated here. All 8 CRM notes carry exactly one concern, and all 8 are **distinct** — so the score fits weights to eight unlabeled points across eight one-off categories, with no outcomes to check against. It would look calibrated and be unfalsifiable. *Why 87 and not 74?* has no answer.

**The CRM signal isn't ignored — it's used where it can be checked.** It picks the products, the facts, the objection, the script, and every claim it produces is validated against the vault. It stays out of the ranking because a ranking has no validator.

What would earn the second term: outcome labels from Salesforce, plus a catalyst feed. Then expected value is *measured*, not asserted.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

**Works with no API key** — demo mode serves bundled briefs labeled "Prerecorded," all real recorded model output that passed the same validator. For live generation, set `GOOGLE_GENERATIVE_AI_API_KEY` in `.env`.

## How well it works

On `gemini-3.1-flash-lite`:

| | Result |
|---|---|
| Deterministic checks | **8 / 8** |
| Golden scenarios, single-shot | 7/8, 8/8, 7/8, 8/8 |
| Golden scenarios, with the repair pass | **8 / 8** |
| Unit + contract tests | **116** |

Both generation numbers are reported on purpose. Single-shot is what the prompt earns alone; the repaired number is what a rep gets. Quoting only the second would flatter the prompt.

```bash
npm test
npm run eval                       # single-shot
npm run eval -- --live --product   # with the repair pass
```

## Layout

```text
data/                8 fictional oncologists + 8 PHI-free CRM notes
knowledge-vault/     34 sourced facts across 4 product notes
prompts/             meeting-prep-v1..v4 + the refinement log
src/lib/brief/       the workflow: draft → validate → repair once → or block
src/lib/validation/  the blocking validator
src/lib/knowledge/   the KnowledgeProvider seam (where retrieval would go)
evals/               8 golden scenarios + the harness
deck/                walkthrough deck and screenshots
```

Product facts are curated from public Tempus pages and have **not** been through medical, legal, or regulatory review.
The golden scenarios are author-labeled regression coverage, not a claim of real-world accuracy.
