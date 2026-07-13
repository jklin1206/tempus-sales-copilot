# Prompt refinement log

Every runtime-prompt iteration and *why* it changed.
This is the deck's "validation steps used to refine the solution" evidence, so it records what actually happened, including the two cases where the evaluation was wrong and the model was right.

Eval command: `npm run eval -- --live` (8 golden scenarios).

Numbers are labeled with the model they were measured on. They are never reattributed: a result for
one model is not evidence about another.

**Prompt iteration history, all measured on `groq` / `openai/gpt-oss-20b`:**

| Version | Single-shot | With the product's retries | What changed |
|---|---|---|---|
| v1 | not run | not run | Initial draft, written before the validator existed. |
| v2 | **2 / 8** | not measured | Rewritten against the validator contract. |
| v3 | **5-6 / 8** | **8 / 8** | Driven by the v2 failures below. |
| v4 | **5-6 / 8** | **8 / 8** | The product pivot: no `why_now`, `why_tempus` instead. |

**The default provider, `google` / `gemini-3.1-flash-lite`, measured on v4:**

| Mode | Result |
|---|---|
| Single-shot | **7 / 8, 8 / 8, 7 / 8, 8 / 8** |
| Product mode (one draft, one repair) | **8 / 8** |
| Deterministic | **8 / 8** |

Gemini is materially better at single-shot compliance than the small Groq model (7-8/8 against 5-6/8) on
the identical prompt and the identical validator. Both land at 8/8 in the product. The bundled demo briefs
are recorded on Gemini, since that is the default path.

Both numbers are reported on purpose.
`npm run eval -- --live` generates each brief **once**, with no repair, which is the honest measure of the prompt.
`npm run eval -- --live --product` allows the one repair call a rep actually gets: a rejected draft is shown its failed checks and asked to fix them, once, before the brief is blocked.

Quoting only the second number would flatter the prompt.
An early v3 run scored 8/8 single-shot and it was tempting to stop there, but repeating the run showed that was a lucky sample.

("Product mode" meant up to five independent redraws until this was rewritten. See *Retry policy: five draws to one repair* at the bottom for why that was the wrong mechanism, and what replaced it.)

## Model choice (Groq)

| Model | Single-shot | Product mode | Notes |
|---|---|---|---|
| `openai/gpt-oss-20b` **(Groq default)** | 5-6 / 8 | **8 / 8** | The small free model. |
| `openai/gpt-oss-120b` | 7-8 / 8 | 8 / 8 | Six times larger. Better on its own, no better in the product. |
| `llama-3.3-70b-versatile` | n/a | n/a | No `json_schema` support: returns a 400. |
| `llama-3.1-8b-instant` | n/a | n/a | No `json_schema` support: returns a 400. |

The small model is the default on Groq.
It is measurably worse at one-shot compliance, and it reaches the same place in the product, because the validator gates every attempt identically and a retry only costs time on a brief that was going to be thrown away anyway.
Reaching for the bigger model would have bought a better single-shot number and no better outcome for the rep.

Structured output support is the real constraint, not size. It is what lets Zod reject a malformed brief before the factual validator runs, and the two obvious Llama choices do not have it.

## 2026-07-10 - Phase 0

- Repo scaffolded; runtime prompts are authored under `prompts/`.
- Decision recorded: numbers are always extractive from the knowledge base; the LLM writes prose only. This constraint is encoded in every prompt and enforced by the grounding validator.
- Provider decision: generation targets the Groq free tier, swapped from Gemini before any prompt was written. The LLM stays isolated in one module, so changing provider is a one-file change.

## v1 - initial draft

A short prompt with the obvious rules: cite fact IDs, do not invent facts, copy the CRM excerpt, keep the script to 65 to 80 words.

Never run against the live model.
It was written before the validator existed, and once the validator was written it was clear v1 did not describe the contract the validator would actually enforce.
It is kept in the repo as the honest starting point rather than backfilled with results it never produced.

## v2 - written against the validator contract

Rewrote the prompt so every rule in it corresponds to a check the validator performs: fenced the CRM note and vault as untrusted data, forbade population from influencing the product angle, spelled out the abstention path, and enumerated the prohibited claims.

**First live run: 2 / 8.**

Three distinct causes, and only one of them was the prompt's fault.

### Failure 1: qualifiers attached to multi-claim facts (5 of the 8 scenarios)

`xf-plus-identity-01` read:

> xF+ is a 523-gene liquid-biopsy panel covering SNVs, INDELs, copy-number gains, and gene rearrangements, **and identifying variants potentially associated with clonal hematopoiesis.**

with `Qualifiers: potentially`.

The word "potentially" belongs only to the clonal-hematopoiesis clause.
But the validator required it in any prose citing the fact, so a brief that cited the fact purely for its gene count was blocked for dropping a qualifier that had nothing to do with what it said.
Five scenarios died this way.

The prompt was not the problem.
The vault was: the spec requires each fact to hold **one factual claim**, and this fact held two.

**Fix (data, not prompt):** split every multi-claim fact so each carries exactly one claim and exactly the qualifiers inseparable from it.

- `xf-plus-identity-01` (gene count) + new `xf-plus-chip-01` (clonal hematopoiesis, `potentially`).
- `xr-capability-01` (RNA sequencing) + new `xr-fusion-coverage-01` (fusions across more than 100 genes, `clinically relevant`) + new `xr-splicing-01` (altered splicing).
- `xt-heme-identity-01` (the assay) + new `xt-heme-considerations-01` (diagnostic and prognostic considerations, `considerations`).

Also relaxed the analytical-performance qualifiers from three required phrases to two.
Requiring "positive percent agreement" *and* "negative percent agreement" verbatim inside a 75-word script is not achievable, and "percent agreement" is the phrase that does the real work of stopping "99.2% accurate".

Four redundant performance facts were dropped to stay inside the spec's 25-to-35 budget. Vault total: 34.

### Failure 2: numbers cited without their fact (p02)

The model wrote:

> "...within 7 days for the **105-gene** xF panel, and within 7 to 9 days for the broader **523-gene** xF+ panel"

while citing only `xf-turnaround-01` and `xf-plus-turnaround-01`.
Both numbers are true and both are in the vault, but neither is in a *cited* fact, so the validator read them as invented and blocked the brief.
That is the validator working correctly.

**Fix (prompt):** v3 states the rule with the failing example.
Gene counts live in the identity facts, not the turnaround facts: mention a number, or cite its fact, never the first without the second.
v3 also forbids comparative language ("the broader..."), since no fact supports a comparison and none is needed.

### Failure 3: the validator was wrong and the model was right (p01)

The abstention scenario failed on `prohibited_claim:pricing_or_coverage_claim`. The model had written:

> "I understand you are looking for details on patient **out-of-pocket costs** and the reimbursement pathway... our approved product facts do not include pricing or coverage information, so I cannot provide that data."

This is exactly the behavior the entire abstention path exists to produce.
The prohibition pattern matched the *topic* rather than a *claim*, so it punished the model for naming the thing it was declining to answer.
You cannot abstain from a cost question without saying the word "cost".

The same bug was in the eval itself: scenario 1 forbade `/guarantee/i`, which failed the model for correctly writing "a typical expectation, not a guarantee".

**Fix (validator and eval, not prompt):** every prohibition now matches an assertion, never a subject.
Pricing is blocked on a stated amount or a definitive coverage claim (`$0`, "covered by Medicare", "reimbursed at"), not on the word "cost".
Both are pinned by regression tests built from the exact model output that was falsely blocked.

### Also surfaced by the same run

The model emits U+2011 non-breaking hyphens ("liquid‑biopsy") and curly apostrophes.
The exact-substring CRM check and the qualifier check compared raw code points, so a genuinely verbatim quote could fail on a glyph.
Both now normalize typography before comparing.
Wording is still never normalized, so a paraphrase still fails.

## v3 - current

Changes from v2:

1. Qualifier preservation stated explicitly, with a worked example of one correct sentence and two blocked ones. This was the single most common block.
2. The number/citation rule, with the p02 failure as its example, and the rule that generalizes it: if you describe what a product IS, cite that product's identity fact.
3. "Say only what answers the concern." The model kept volunteering gene counts on a turnaround question, which answered nothing and forced a second citation it then forgot to make.
4. A statistic without its denominator is an overclaim, with the `xr-study-fusion-uplift-01` failure as its example.
5. Comparative language forbidden outright.
6. A four-point self-check before answering.
7. `abstention_reason` documented as `""` when grounded, because Groq's strict schema mode has no optional fields.

**Result: 7-8 / 8 single-shot, 8 / 8 with the product's retry, 6 / 6 deterministic.**

### Two things that did not work, kept here because they are the useful part

**Raising `reasoning_effort` to `high` made it worse, not better.** The intuition was that
more deliberation would improve constraint compliance. Measured, it dropped the suite from
6/8 to 4/8: the model spent its entire completion budget on reasoning and returned an empty
string, which the provider then rejected as invalid JSON. The compliance this brief needs
came from the checklist in the prompt, not from buying more thinking. Reverted to `medium`
and raised the token ceiling instead.

**Two of the "model failures" were validator bugs.** Chasing the prompt would never have
fixed them:

- The prohibited-claims patterns matched a *topic* rather than a *claim*, so the abstention was blocked for saying the word "cost" while declining to discuss cost.
- The number extractor stripped the `xf` from an inline fact ID like `xf-turnaround-01` and then reported the leftover `01` as a fabricated number, blocking correctly grounded briefs.

Both now have regression tests built from the exact model output that was falsely blocked.
The lesson worth keeping: when an eval fails, read what the model actually wrote before
assuming it was wrong.

### What still fails, and why it is left alone

Single-shot, roughly one scenario in ten is still blocked, almost always because the model
mentioned a gene count without citing the identity fact that states it, or shaved a
qualifier off a study statistic to fit the 65-to-80 word script. These are real errors and
the validator is right to block them. They could be tuned away by loosening the checks,
which would mean shipping the overclaims instead of catching them. The product regenerates
once, which clears them, and a brief that fails twice is shown to the rep as blocked rather
than guessed at.

## Infrastructure notes from the same iteration

- `llama-3.3-70b-versatile` does not support `response_format: json_schema` on Groq and returns a 400. Switched to `openai/gpt-oss-120b`, which does. Strict structured output is load-bearing: it is what lets Zod reject a malformed brief before the factual validator ever runs.
- `gpt-oss-120b` is a reasoning model, and its reasoning tokens are billed against the completion budget. A budget sized for the visible JSON alone gets spent on reasoning and returns an empty string, which the provider then rejects as invalid JSON. Raised to `max_completion_tokens: 8000` with `reasoning_effort: medium`. Reasoning content is never requested, read, stored, or displayed.
- Groq occasionally fails its own schema check during generation (`json_validate_failed`). That is a transient generation fault rather than a bad request, so it is retried up to three times. A brief that the *validator* rejects is never retried: it is surfaced as blocked.


## v4 - current

Not a grounding change. A product change, and the prompt had to follow it.

### What was removed

- **`why_now` is gone.** It was derived from a CRM `next_action_date`, which is a scheduling cue and
  not a market catalyst, so it answered the wrong question. The case study asks "Why Tempus, why
  now?", and a date in a snapshot CSV cannot answer the second half of that.

  Nothing replaces it. A manufactured urgency field is worse than an absent one, so v4 adds an
  explicit prohibition: the model has no approvals, no guideline changes, no publications and no
  launch dates, and it may not write "now is the time" or imply that anything recently changed. The
  eval asserts this with a `does not manufacture urgency` check.

  A real "why now" needs a governed, dated catalyst feed. That is described in SPEC.md as a
  production capability rather than faked here.

- **`conversation_angle` is replaced by `why_tempus`**: one or two sentences tying THIS physician's
  CRM context to supported evidence. The old field was a sub-15-word phrase that no rep would read
  aloud. The new one is the thing they actually need.

### What broke, and what fixed it

Adding a whole new prose field cost accuracy elsewhere, which is worth recording because it was not
obvious in advance: the model now had one more place to spend attention, and product mode dropped
from a steady 8/8 to 7/8, 6/8, 8/8. Three causes, all real:

1. **Script word count.** Scripts started landing at 53, 61, 64 words. Fixed by giving the prompt a
   four-part structure with word budgets and an explicit "if you are under 65, add the practical
   implication" instruction, plus a warning not to get back into range by dropping a qualifier, which
   trades a word-count failure for a grounding failure.
2. **Empty `abstention_reason`.** The model returned `""` while abstaining, which the validator
   correctly blocks. The prompt now says the empty string is for grounded briefs only.
3. **The chronic study-fact denominator.** `xr-study-fusion-uplift-01` carries `retrospective` and
   `identified fusions`, and both have to fit inside 80 words. The prompt now tells the model plainly
   to keep study statistics out of the script and put them in the objection response, which has no
   word limit.

`PRODUCT_ATTEMPTS` also went from 3 to 5. The validator gates every attempt identically, so this
cannot launder a bad brief, and the eval is pinned to a single attempt precisely so it cannot flatter
the reported prompt quality.

> **Superseded.** Five redraws became one draft plus one repair. See *Retry policy: five draws to one
> repair* at the bottom of this file.

**Result: 5-6/8 single-shot, 8/8 product mode (three consecutive runs), 8/8 deterministic.**

### One new product behavior

When live generation is blocked after every retry, the product now serves that provider's bundled
brief, labeled as a saved demo brief rather than passed off as live. Showing a rep a red error box
when a correct, validated brief for that exact physician is sitting on disk is the wrong trade.

This cannot flatter any measurement: `npm run eval` runs with `liveOnly`, which takes neither the
fixture path nor the cache.

> **Reversed, and it was a mistake.** This is the entry in this file I would most like back. A
> blocked live generation quietly became a prerecorded one, which made the single state where the
> system had *failed* look exactly like the state where it was working. The trade is not "red box vs
> correct brief"; it is "the rep knows what they are holding vs the rep does not". Bundled briefs now
> appear in demo mode and nowhere else, and a blocked brief is reported as blocked. See SPEC.md 9.5.


## v4 measured on Gemini: the same bug, a fourth time

Pointing the harness at `gemini-3.1-flash-lite` immediately surfaced a validator bug, and it was the same
bug that had already been found and fixed twice. Gemini wrote this, which is close to ideal:

> "xF results are typically expected within 7 days of specimen retrieval. This is a typical expectation,
> **not a guaranteed turnaround** and not a service-level agreement."

The validator blocked it for `prohibited_claim:guaranteed_turnaround`. The pattern matched the phrase
"guaranteed turnaround" without noticing the "not a" in front of it. The model said the safe thing out
loud and was punished for using the word it was disclaiming.

The full history of this one mistake:

1. Pricing fired on "I cannot give you out-of-pocket costs."
2. The eval fired on "a typical expectation, not a guarantee."
3. Turnaround fired on "not a guaranteed turnaround and not a service-level agreement."
4. And then the **eval** fired on the same sentence, because it kept its own copy of the rule.

Each of the first three was fixed by patching the individual pattern, which is why it kept coming back.
It is now fixed once, structurally: `stripDisclaimers()` removes negated constructions before any
prohibition runs, and the eval imports **that same function** rather than reimplementing the idea. An
affirmative "we guarantee results in 7 days" still survives the strip and is still blocked. Three
regression tests pin both directions.

The lesson, restated because it keeps costing time: **when an eval fails, read what the model actually
wrote before assuming the model was wrong.** Four of the failures chased in this project were the
harness's fault, not the model's.

### Also fixed

Gemini's free tier rate-limits per minute and returns 429 with a `retryDelay` in the error body. The
retry loop honored a fixed 400ms backoff, which meant a limiter that asked for 38 seconds got hammered
three times and gave up. It now reads `retryDelay` (and `Retry-After`) and waits as long as it was told,
falling back to exponential backoff when the provider says nothing.

## Retry policy: five draws to one repair

The product used to regenerate a rejected brief up to five times before failing closed. Five
independent draws, each running the identical prompt, each gated by the same validator.

It worked, in the sense that the reported numbers were fine: both providers reached 8/8 that way. It
was still the wrong mechanism, for three reasons.

**Nothing was learned between draws.** Attempt five ran the same prompt as attempt one and hoped for a
better sample. Meanwhile the validator knew exactly what had gone wrong -- it names the dropped
qualifier, it names the fabricated number, it counts the words in the script -- and none of that ever
reached the model.

**It cost a rep up to five round trips.** On the path where somebody is waiting.

**It quietly changed what was being measured.** A prompt that needs four samples to land is worse than
one that lands in two, and a loop that keeps drawing until something passes hides the difference.

It is now **one draft and one repair**. If the validator rejects the draft, the model gets exactly one
more call: it is shown the draft that was thrown out, and told which checks failed in language it can
act on.

> These numbers appear in your prose and no fact you cited states them: 3. Either cite the fact that
> does state each number, or remove it. Do not round, convert, or restate a figure.

rather than `numbers_trace_to_cited_facts`. The repaired brief is gated by the identical validator, so
a repair that fixes the qualifier and invents a number still fails.

Measured against the live model by deliberately breaking a valid brief four ways and running the real
repair prompt over each:

| Injected defect | Codes the validator produced | Repair |
|---|---|---|
| Fabricated number ("3 days") | `numbers_trace_to_cited_facts`, `fabricated_numbers:3` | PASS |
| 7-word script | `qualifiers_preserved_in_script:*` (x2), `script_word_count:7` | PASS |
| Stripped qualifier ("typically") | `qualifiers_preserved:xf-turnaround-01` | PASS |
| Paraphrased CRM excerpt | `crm_excerpt_is_exact_substring` | PASS |

4/4, and the two-code case is the interesting one: it received three separate instructions and fixed
all three in one call.

The eval is unchanged in what it reports: single-shot by default, `--live --product` for the repair
pass, both numbers published. The point of cutting five draws to one repair is that the second number
now means something. It is the model correcting a named defect, not the harness rolling dice until it
wins.
