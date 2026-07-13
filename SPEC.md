# Tempus Sales Copilot — Prototype Specification

Status: reconciled with the shipped implementation

Audience: take-home evaluators, product, design, and engineering

Scope: prototype using fictional, PHI-free data and free-tier tooling

## 0. What changed, and why

An earlier version of this spec described a daily territory-management product: a "Today"
view, a top-five daily queue ranked by urgency, saved report history, a simulated cron
refresh, a user-facing Sources browser, and a "Why now" derived from a CRM next-action date.

All of it is removed. The reasoning is worth stating plainly, because it is the main product
judgment in this project:

- **The data cannot support a daily queue.** There is no contacted, completed, or snoozed
  state, no relationship readiness, and no governed catalyst feed. A queue that reorders
  every morning would be theatre: it would look like a task manager and behave like a static
  sort. Worse, the urgency bucket was a monotone function of the date, so sorting by
  `(bucket, date)` produced exactly the same order as sorting by date alone. The buckets
  changed the label and never the ranking.
- **A CRM date is not a market catalyst.** "Why now" derived from `next_action_date` answered
  the wrong question. The case study asks "Why Tempus, why now?", and a scheduling cue in a
  snapshot CSV cannot answer it. Nothing replaces it: a manufactured urgency field is worse
  than an absent one. **"Why now" requires a future governed catalyst feed. I chose not to invent
  it.** See section 17.
- **A rep with ten minutes before a meeting does not want a source browser.** Grounding is a
  guarantee the system makes, not homework it hands to the user. It is now enforced entirely
  server-side and the browser never receives the knowledge base.

What survives is the part that was actually working: complete-context structured generation,
a blocking factual validator, a genuine abstention, and honest evaluation.

## 1. Executive decision

Build a focused meeting-preparation workspace for a territory sales representative. One
workflow:

**Ranked provider list, or search → select a known oncologist → receive a grounded meeting
brief.**

It is a **bounded grounded-generation workflow**. That phrase is the accurate one, so it is the
one used throughout: the steps are fixed and written in code, the model chooses the words and
never the control flow, and every claim it writes is checked against a sourced fact before a rep
sees it. It cannot select a tool, run a search, take an action, or decide to try again.

It is therefore not an agent, and it is not called one anywhere in this repository. Calling it one
would be branding rather than architecture, and it would promise an evaluator a class of system
this is not: there is no tool loop, no planner, and nothing autonomous. It is also not a chatbot,
task manager, clinical decision-support system, or CRM replacement.

One Next.js application deployed to Vercel. Complete-context generation over a small Markdown
product vault. No vector database, no RAG retrieval, no Agent SDK, no cron job, no email, no
database, no authentication, no live CRM integration.

## 2. Problem definition

Tempus sales representatives have useful data in separate places: market intelligence
estimates opportunity size, CRM notes capture relationship context and objections, and product
materials contain factual test capabilities and performance metrics.

The gap is not raw access to data. It is the time and judgment required to turn those sources
into a credible, prospect-specific "Why Tempus" conversation before a short meeting.

This prototype reduces preparation time while guaranteeing, in code, that every product claim
it makes is supported by a sourced fact. It does not determine patient eligibility, recommend
a clinical test, predict a sale, or replace rep judgment.

## 3. Primary user and jobs

Primary user: one Tempus territory sales representative managing a fictional territory of
eight oncologists.

Jobs:

- See the territory ranked by opportunity, and understand exactly why it is ordered that way.
- Find a known physician by name or organization.
- Open a physician and get a grounded preparation brief, in roughly ten seconds.
- Read a clear abstention when the available knowledge does not support the physician's concern.

Explicitly not a job: managing a daily task list. The product does not tell the rep who to
call today, because the data does not know.

## 4. Product experience

### 4.1 The workspace

One view. The complete territory, ranked by estimated opportunity, with a search box in the
header. There is no navigation between modes because there is only one mode.

### 4.2 Provider selection

A searchable combobox lists only known physicians from the market CSV, matching physician name
and provider organization.

Selecting a physician is the action. There is no free-text query and no second "Generate"
button.

Opening a physician generates a brief, every time. There is no cache: a cache made the second
visit instant, and it also meant a rep could read prose written minutes ago while believing it was
written now, which the UI then had to explain to them. Generation takes a few seconds, and the
ambiguity was not worth saving them.

During generation the panel shows a skeleton and one honest line. It does not show a checklist of
progress steps: an earlier version advanced "Loaded CRM note" and "Validating claims" on a 1.8
second timer that knew nothing about the server, which is theatre. Hidden reasoning and
chain-of-thought are never displayed.

A row in the territory list and a result in search lead to the same provider-detail route.

### 4.3 The brief

The detail page shows the physician, their organization, their estimated opportunity, their
CRM note, and the brief:

- **Why Tempus, for this provider** — one or two sentences tying their CRM context to supported
  evidence.
- **From your CRM** — the physician's note, with the sentence the brief is standing on marked
  inside it.
- **Talking points** — 2 to 4 product facts in rep-facing language, each with a link to the Tempus
  page it came from.
- **Objection response** — grounded, or an explicit abstention.
- **30-second meeting script** — 65 to 80 words.
- A provenance label when, and only when, the brief is prerecorded (see 9.5).

That is all. No fact IDs, no evidence trace, no prompt viewer, no raw Markdown, and no knowledge
vault. The brief is what a rep reads on the way into a meeting.

**The source link is the one exception, and it is deliberate.** An earlier version of this spec
said no source URLs crossed the wire, on the reasoning that grounding is a guarantee the system
makes rather than homework it hands to the rep. That reasoning is still right about the *trace*,
and it was wrong about the *link*. When a physician pushes back on a claim, the rep needs somewhere
to point, and that is a different job from auditing the system: it takes one click, it happens
inside the conversation, and no fact ID or validation code is involved. So each talking point
carries the URL and section of the page behind it, and nothing else.

Only the sources of facts the brief **actually cited** are sent. The vault stays on the server, or
the client is holding the knowledge base by another name; a test asserts this.

## 5. Required outputs

| Required output | Prototype implementation |
|---|---|
| Ranked provider list | Complete territory, ranked by estimated opportunity |
| Objection Handler | Grounded draft, internally citing verified product fact IDs |
| Meeting Script | Tailored 65-80 word pitch, at most two cited product facts |

## 6. Input contracts and ownership

The prototype begins **after ingestion**. All three inputs are versioned snapshots committed to
the repository. See section 8.3 for the production ingestion boundary.

### 6.1 Market intelligence CSV

`data/market/providers.csv`:

| Column | Type | Meaning |
|---|---|---|
| `physician_id` | string | Stable fictional join key |
| `oncologist_name` | string | Individual oncologist; the ranked unit |
| `provider_org` | string | Clinic, hospital, or health-system context |
| `likely_patient_population` | positive integer | Mock annual opportunity-size estimate |

`likely_patient_population` is a **directional proxy only**. It is not testing volume,
eligible-patient count, conversion probability, revenue, product fit, or clinical suitability.
It orders the list and nothing else, and it never influences which product a brief discusses.

### 6.2 CRM notes

`data/crm/<physician_id>.md`, one PHI-free fictional note per physician:

```yaml
---
physician_id: p02
last_contact: 2026-07-02
---
```

The body contains the prior interaction, interests, known concern, and next step. It may
contain untrusted prose but no patient identifiers.

There is deliberately **no `next_action_date`**. It existed to drive the daily queue and the
"why now", and both are gone. Leaving the field in place would only invite them back.

CRM is the only source of physician-specific product interest. Market population must never
influence product selection.

### 6.3 Product knowledge vault

Ordinary, version-controlled Markdown, Obsidian-compatible:

```text
knowledge-vault/
  README.md
  Products/
    xT-CDx.md
    xR.md
    xF-and-xF-Plus.md
    xT-Heme.md
```

34 neutral, sourced facts across four notes. Each fact carries a stable fact ID, exactly one
factual claim, required qualifiers, measurement details or a timing anchor, product IDs, an
official source URL and section, and a retrieval date.

```markdown
### `xf-turnaround-01`

- Product: xf
- Fact: xF results are typically expected within 7 days of specimen retrieval.
- Qualifiers: typically
- Timing anchor: specimen retrieval
- Source: https://www.tempus.com/solutions/xf/
- Source section: Turnaround Time
- Retrieved: 2026-07-10
```

**One claim per fact is a hard requirement**, because the qualifier validator depends on it: a
fact bundling two claims forces the qualifier of one onto prose that only made the other. The
34 facts exist to serve that validator, not to hit a number a user sees. Nobody sees the count.

The vault contains facts, not sales logic: no objection-to-fact mappings, physician segments,
product-fit scores, prewritten scripts, comparisons, inferred patient suitability, or approval
labels.

**Pricing, payer coverage, and out-of-pocket exposure are deliberately absent.** They require
approved internal sources. This is what makes the reimbursement abstention genuine rather than
staged, and a test asserts no such fact is ever added.

Broader research captures remain in `research/` and are excluded from runtime context.

### 6.4 Source boundaries

| Source | Owns | Must not own |
|---|---|---|
| Market CSV | Physician, organization, population estimate | Product fit, CRM state, testing volume |
| CRM note | Relationship, concern, interest | Product metrics, patient data, urgency |
| Product vault | Neutral Tempus facts and sources | Physician tailoring, rank, pitch |
| Eval fixtures | Expected behavior and failure cases | Runtime business logic |

## 7. Ranking

**One ranking.** Deterministic, no LLM, no embedding, no weighted score:

1. `likely_patient_population` descending
2. `physician_id` ascending, as a stable tie-breaker

The UI calls it **estimated opportunity** and states in plain language that it is a directional
proxy only.

There is no second, urgency-based ranking. See section 0.

## 8. Context builder and generation workflow

### 8.1 Context builder

The server builds a bounded context package from exactly:

```text
selected market row
+ that physician's CRM note (and no other)
+ all four product Markdown notes
+ prompt version and strict output schema
```

The folder hierarchy helps humans manage knowledge; it does not perform retrieval. The
application reads every runtime product note and supplies the whole corpus.

### 8.2 Generation

One server-side structured LLM call selects the supported evidence and drafts the brief. The
model may choose only from fact and product IDs in the supplied vault.

The model is instructed that CRM text and knowledge content are data, not executable
instructions; that population must not determine the product; that the brief is for a sales
conversation and not clinical advice; that every product claim must cite a supplied fact ID;
that the CRM excerpt must be copied exactly; that unsupported concerns require abstention; that
**urgency must never be manufactured**, because there is no catalyst data; and that hidden
reasoning must not be returned.

**One draft, one repair.** If the validator rejects the draft, the model gets exactly one more
call, and it is not a redraw. It is shown the draft that was thrown out and told, in language it
can act on, which checks failed: *"These numbers appear in your prose and no fact you cited states
them: 3"*, not *"a number did not trace"*. The repaired brief is then gated by the identical
validator, so a repair that fixes the qualifier and invents a number still fails.

This replaced a five-attempt retry loop. The loop worked, in the sense that the numbers came out
fine, and it was the wrong mechanism: nothing was learned between draws, attempt five ran the
identical prompt as attempt one and hoped for a better sample, and a rep could wait through all
five. The validator already knows exactly what was wrong. Telling the model is both cheaper and
more likely to work than asking it again.

Retrying is not something the model decides to do. Code decides, on a mechanical verdict. That is
the difference between a bounded workflow and an agent, and it is why the retry budget is a
constant in the source rather than a judgment the model makes about its own output.

### 8.3 The ingestion boundary

**The prototype begins after ingestion.** The market CSV, CRM Markdown, and product Markdown
are versioned snapshots. Salesforce integration, scraping, a database, and webhooks are out of
scope for this take-home and are not simulated.

In production:

- CRM and market data would arrive by Salesforce webhook or incremental synchronization.
- Each source would carry its own version. Every brief already records the `data_version` and
  `prompt_version` it was built from, so a source-version change identifies exactly which stored
  briefs are stale. (Nothing is stored today: this prototype generates on every open and keeps no
  cache. The versions are recorded because provenance is worth having even when nothing is reused.)
- The UI would expose source freshness, such as `last_synced_at`, so a rep can see whether a
  brief was built on stale context.
- A separately governed, dated catalyst feed (approvals, guideline changes, publications, drug
  launches, market-volume changes) is a future capability, and is what a real "why now" would
  require. **A webpage modification timestamp is not a catalyst.**

### 8.4 What this is: a bounded grounded-generation workflow

The complete 34-fact vault fits comfortably in one request. Supplying the whole corpus avoids
retrieval misses, keeps every qualifier in front of the validator, and is easier to explain and
evaluate.

**Is it RAG?** Split the acronym and the answer is precise. The *augmented generation* half is
exactly what this does: the model is grounded in external knowledge read at request time rather
than in its own weights, and it may assert nothing the supplied facts do not support. The
*retrieval* half is deliberately absent: there is no embedding, no vector index, no cosine
similarity, no top-k, and no search tool. Every fact goes in every time.

So the accurate description is RAG's architecture **with the retriever set to the identity
function**, which is not a dodge but the literal shape of the code: `KnowledgeProvider` is the
retriever seam (9.2), and `FullVaultKnowledgeProvider` is the implementation that retrieves
everything. Claiming a retrieval step that does not exist would be branding; pretending the system
is not grounded in external documents would be false. It is the first half of RAG, done properly,
with the second half left out because at 6,500 tokens retrieve-everything strictly dominates it:
perfect recall, by construction, at the same cost.

There is likewise no tool loop, no planner, and no model-selected action, and calling it an agent
would be a bigger mistake: an evaluator hearing "agent" expects a system that decides what to do
next, and this one cannot. The model has exactly one job, and it is to write words that code then
checks.

That is still a real GenAI system, and the honest description of it is the one in the heading: the
LLM performs bounded semantic matching and grounded synthesis over a fixed context, and code
controls data access, ranking, retries, validation, and UI state.

## 9. Technical architecture

```text
Browser
  → Next.js App Router UI
      → deterministic opportunity ranking and provider lookup   (no LLM)
      → POST /api/brief
          → exact provider/CRM join
          → FullVaultKnowledgeProvider                          (all 34 facts, one request)
          → ModelProvider: google                               (one seam, one adapter)
          → Zod schema validation
          → factual and safety validation                       (blocking)
          → one repair call if the validator rejected the draft (8.2)
          → grounded brief, abstention, or visible failure
      → ClientBrief: validated prose, a source link per cited claim, provenance label
```

### 9.1 Stack

Next.js App Router, TypeScript, Zod, Tailwind. Vitest for tests. Markdown and CSV committed with
the prototype. Vercel for one full-stack deployment. No Python service, VPS, queue, database, or
second deployment.

### 9.2 Knowledge abstraction

```ts
interface KnowledgeProvider {
  getContext(input: { physicianId: string }): Promise<KnowledgeContext>;
}
class FullVaultKnowledgeProvider implements KnowledgeProvider {}
```

A future `IndexedKnowledgeProvider` can implement full-text or hybrid retrieval without changing
the brief-generation contract. Retrieval is not built now because there is nothing to retrieve
from yet.

### 9.3 Model provider abstraction

```ts
interface ModelProvider {
  id: string;
  modelName(): string;
  hasApiKey(): boolean;
  generate(prompt: BuiltPrompt): Promise<ProviderResult>;
}
```

**One abstraction, one validator.** A provider's only job is to return a schema-valid `ModelBrief`;
everything downstream is identical whichever one ran. Two providers must never mean two pipelines.

There is one adapter today, Google Gemini. A second (Groq) was built, measured, and removed: it was
never a fallback, and keeping a second adapter alive to prove the seam exists is how a seam becomes
a liability. The `ModelProvider` interface stays, because that is where a vendor's quirks belong.

The chosen model must support strict structured output (`responseSchema` on Gemini). That is what
lets Zod reject a malformed brief before the factual validator runs.

### 9.4 API contract

`POST /api/brief` with `{ "physicianId": "p02" }`.

There is no `forceRefresh`. Every request generates, so there is nothing to force.

1. Validate that the physician exists.
2. Load exactly one matching CRM note.
3. Load the complete runtime vault.
4. Record data and prompt versions.
5. Make one structured model call.
6. Run all blocking validation.
7. If the draft was rejected, make one repair call and validate again (8.2).
8. Return a grounded result, an explicit abstention, or a visible failure.

The response is a **ClientBrief**: validated prose, a source link for each cited claim, and a
provenance label. Fact IDs, the validation trace, and the vault never cross the wire. See 4.3 for
why the source link is the one thing that does.

### 9.5 Provenance and run mode

`generation_mode` has two values, because there are only two things worth telling a rep apart:

- `live_generation` — written for them, in this request.
- `demo_fixture` — a bundled recording of real model output that passed this same validator.

`cached_generation` is gone with the cache it described. "Cached" told a rep nothing they could act
on and invited them to wonder whether the prose in front of them was stale.

**Demo mode is a mode, not a fallback.** The app is in demo mode when, and only when, no model key
is configured. Then every brief is prerecorded, the header says so on every screen, and the panel
labels each one. In live mode a bundled brief is never served: a provider outage returns a 503, and
a brief the validator blocks is reported as blocked.

An earlier version fell back to a fixture whenever live generation failed. It was well-intentioned
(a correct brief beats a red box) and it was wrong: it made the one state where the system had
failed look exactly like the state where it was working, and a rep could carry a brief into a
meeting believing the model had just written it for that physician. A validator nobody can see
firing is also a validator nobody maintains.

The UI must never present a prerecorded brief as a live model response.

## 10. Structured brief contract

```json
{
  "physician_id": "p02",
  "grounding_status": "grounded",
  "product_ids": ["xf"],
  "why_tempus": "Dr. Chen needs blood-based results inside a first-line decision window...",
  "supporting_crm_excerpt": "she asked how quickly liquid-biopsy results are typically returned",
  "product_snapshot": [
    { "fact_id": "xf-turnaround-01", "display_text": "xF results are typically expected within 7 days of specimen retrieval." }
  ],
  "objection_response": { "text": "...", "fact_ids": ["xf-turnaround-01"] },
  "meeting_script": { "text": "...", "fact_ids": ["xf-turnaround-01"] },
  "generation_mode": "live_generation",
  "prompt_version": "meeting-prep-v4",
  "data_version": "2026-07-12"
}
```

There is **no `why_now`**. See section 0.

`grounding_status`:

- `grounded` — all required checks pass
- `abstain` — supplied facts do not support the concern
- `validation_failed` — generated prose was blocked

If the concern is unsupported, the objection handler abstains and the product snapshot is empty.

## 11. Validation and safeguards

### 11.1 Before generation

Physician ID exists in market data. Exactly one CRM note matches. No other physician's CRM text
enters context. Runtime knowledge files load. Prompt and data versions recorded.

### 11.2 Schema validation

Zod rejects missing fields, invalid enums, excess fact counts, and malformed fact references
before anything is rendered.

### 11.3 Programmatic factual validation

- Every returned fact ID exists in the exact supplied vault.
- Product IDs agree with the referenced facts.
- The CRM excerpt is an exact substring of the selected CRM note.
- Every number in the prose traces to a fact the model actually cited.
- Required qualifiers survive, in any accepted surface form.
- No guaranteed turnaround, unsupported superiority, competitor assertion, drug-approval claim,
  clinical recommendation, or pricing claim.
- The product snapshot contains 2 to 4 facts when grounded.
- The script contains 65 to 80 words and references at most two product facts.

Any critical failure **blocks all generated prose**. The safe result is an explicit failure state
or an abstention, never a partially grounded pitch.

Every prohibition matches an **assertion, never a topic**. A brief that says "I cannot give you
out-of-pocket costs" is doing exactly the right thing; an earlier version of these rules blocked
it for naming the subject it was declining to discuss.

### 11.4 Prompt injection and data isolation

CRM and Markdown content are treated as untrusted quoted data and fenced from instructions.
Unknown physician IDs are rejected. Server-side data paths are allowlisted. Cross-provider leakage
and CRM-embedded instructions are tested.

### 11.5 Observable trace, not chain-of-thought

The server records prompt and data versions, provider and CRM IDs loaded, product notes and
selected fact IDs, validation results and failure codes, generation mode, latency, and model
errors.

This trace is **server-side only**. It is not shown to the rep and not sent to the browser. Private
chain-of-thought is never requested, stored, displayed, or graded.

## 12. Evaluation plan

### 12.1 Golden scenarios

Eight author-labeled scenarios: turnaround, insufficient tissue, liquid-panel breadth, fusion/RNA
capability, tissue-panel breadth, hematologic profiling, existing vendor without unsupported
comparison, and unsupported reimbursement requiring abstention.

`npm run eval` generates each brief **once**, with no repair pass, which is the honest measure of
the prompt: a prompt that needs the repair is a weaker prompt than one that lands first time.
`npm run eval -- --live --product` allows the one repair call a rep actually gets. Both numbers are
reported; quoting only the second would flatter the prompt.

With no key configured the app is in demo mode, and the eval evaluates the bundled briefs against
the same validator and the same assertions. It never silently substitutes one for a live brief that
failed: `--live` fails the run instead.

### 12.2 Adversarial cases

CRM prompt injection, unknown physician ID, cross-provider CRM leakage, fabricated fact ID or
metric, dropped qualifier or timing anchor, unsupported competitor assertion, unsupported concern
disguised as a product question, and manufactured urgency.

Critical grounding or isolation failures block deployment.

### 12.3 Prompt iteration evidence

`prompts/meeting-prep-v1..v4.md` and `prompts/CHANGELOG.md`, which records the observed failure,
the change, and the before/after eval result, **including the two rounds where the validator was
wrong and the model was right.**

Target gate:

```bash
npm test
npm run eval
npm run build
```

## 13. Security and hosting

- Model API keys live in server-side environment variables, never named `NEXT_PUBLIC_*`.
- Product knowledge and CRM fixtures are loaded only by server code and are never placed under
  `public/` or sent to the browser.
- A per-session generation cap protects a demo key.
- The public deployment contains only fictional, PHI-free data.
- **With no key configured, the app runs in demo mode** and serves clearly labeled bundled briefs,
  recorded from real model output that passed the same validator. All eight providers have one, so
  a reviewer without credentials can exercise the entire workflow. Demo mode is stated in the
  header and on every brief.
- **A provider failure is not demo mode.** With a key configured, a failed generation fails
  visibly. See 9.5.

## 14. Assumptions

- The primary user is a territory sales rep.
- The territory has eight fictional oncologists; an oncologist is the ranked unit.
- Likely patient population is an adequate directional opportunity proxy and nothing more.
- The small curated vault is authoritative only within prototype scope.
- All runtime product knowledge fits in one model request.
- The free-tier model can be slow or unavailable, so a reviewer needs a credential-free path
  through the whole workflow. That is what demo mode is for. It is not a safety net for live
  generation.
- This is a sales aid and never clinical advice.

## 15. Tradeoffs and rationale

| Decision | Benefit | Cost / risk | Mitigation |
|---|---|---|---|
| One opportunity ranking | Explainable and testable | Not predictive | Label population as a directional proxy |
| No daily queue | Does not fake a task manager | Rep must choose who to open | Add one when the data supports it |
| No "why now" | Does not manufacture urgency | Loses a case-study phrase | Explain the catalyst feed a real one needs |
| Grounding kept server-side | Rep reads a brief, not homework | Cannot audit in-app | Source link per claim; trace logged; evals public |
| Complete vault context | No retrieval misses; qualifiers preserved | Context will grow | KnowledgeProvider seam |
| Small model + one repair | Cheap; the validator gates the repair identically | Weaker single-shot | Report both numbers honestly |
| Fail visibly in live mode | The rep is never misled about what they are reading | A rep can see an error | Demo mode covers the credential-free path |
| Bundled briefs, no DB | Reliable demo, minimal infrastructure | No durable history | Demo mode is explicit and labeled |

## 16. Explicit prototype cuts

Not implemented: vector database, embeddings, or retrieval pipeline; Agent SDK or tool loop;
chatbot; cron endpoint or background queue; email, SMS, Slack, or calendar delivery; database,
authentication, or user management; Salesforce or live market-data integration; scraping;
drug-approval or publication pipeline; CMO/account hierarchy; patient-level recommendations;
medical/legal/regulatory approval workflow; real PHI.

Also cut, after building them: the daily queue, report history, cron simulation, the user-facing
Sources browser, and CRM-derived "why now". Those are described in section 0.

## 17. Production evolution

1. **Prototype:** complete Markdown vault, one bounded generation call.
2. **Ingestion:** Salesforce webhooks or incremental sync; per-source versions that invalidate
   dependent briefs; `last_synced_at` freshness surfaced in the UI.
3. **Catalyst feed:** a separately governed, dated feed of approvals, guideline changes,
   publications, and launches.

   **"Why now" requires a future governed catalyst feed. I chose not to invent it.** The case study
   asks "Why Tempus, why now?", and the honest answer from this data is that the second half of the
   question cannot be answered yet. The inputs contain no dated market events at all: a CRM
   next-action date is a scheduling cue, and a webpage modification timestamp is a deployment
   artifact. Either one could have been dressed up as urgency and shipped, and it would have
   demoed well. It would also have been the one thing in this product that was not true. This is
   the single highest-value addition, and it is a data problem before it is a model problem.
4. **Larger corpus:** metadata manifest plus deterministic keyword search; measure retrieval recall.
5. **Many heterogeneous documents:** hybrid retrieval and reranking, only if it improves quality.
6. **Governed sales use:** a versioned claim registry with region, effective dates, expiration, and
   medical/legal/regulatory status.
7. **Dynamic enterprise workflow:** an Agent SDK only when the model must choose among live CRM,
   calendar, publications, and outbound actions under permissions and audit logs.

## 18. Success criteria

- An evaluator understands the workflow without instruction.
- Every provider is findable and selectable, and every one has a usable brief.
- The ranking is correct, transparent, and honestly described.
- A first live brief returns in roughly ten seconds; bundled briefs open immediately.
- Every displayed product claim is backed by a supplied fact, verified before it renders.
- The unsupported reimbursement case abstains.
- The 65-to-80 word script passes validation.
- No other provider's CRM note leaks into context.
- The eight golden scenarios pass deterministic regression checks.
- Nothing in the product claims a capability the data does not support.

## 19. Deliverables

- One public Vercel URL if free hosting is available.
- Local setup instructions and a no-key demo path.
- Fictional market CSV, eight CRM notes, four sourced product notes.
- Ranked territory, searchable selection, grounded briefs, bundled briefs, and eval summary.
- Eight-slide deck and a three-to-five-minute video.

## 20. Definition of done

- The application builds and deploys from a clean checkout.
- No required feature depends on a paid tool.
- The demo works with and without a model key.
- Input and output schemas are versioned and validated.
- Ranking logic has unit tests and a visible explanation.
- All eight provider/CRM joins reconcile exactly.
- Every runtime fact has a source URL, retrieval date, and required qualifiers.
- Grounded, abstain, and validation-failure states are testable.
- `npm test`, `npm run eval`, and `npm run build` pass.
- README, spec, deck, video, and prototype describe the same architecture and scope.
