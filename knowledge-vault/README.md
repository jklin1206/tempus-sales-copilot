# Tempus Product Knowledge Vault

This is the complete runtime product knowledge for the prototype.
Every product claim the application can make must cite a fact ID defined in `Products/`.
The model may not invent product facts, and the validator rejects any fact ID that does not appear here.

**This vault is server-side only.** It is never sent to the browser, and there is no user-facing
source browser: grounding is a guarantee the system enforces, not homework it hands to a rep with
ten minutes before a meeting. Fact IDs exist as internal citation and validation anchors.

This vault is a sales-demo aid.
It is not medical advice, and it is not an internally approved Tempus sales-enablement artifact.

## Contents

| Note | Products | Facts |
|---|---|---|
| `Products/xT-CDx.md` | `xt_cdx` (with `xr` where the source claim is combined) | 10 |
| `Products/xR.md` | `xr` | 7 |
| `Products/xF-and-xF-Plus.md` | `xf`, `xf_plus` | 12 |
| `Products/xT-Heme.md` | `xt_heme` (with `xr` where the source claim is combined) | 5 |

Total: 34 facts.

The count is not a target. Facts are split so that **each holds exactly one claim**, because the
qualifier validator depends on it: a fact bundling two claims forces the qualifier of one onto prose
that only made the other. They are not collapsed to reduce a number nobody sees.
The whole vault is sent to the model in one request, so there is no retriever and no retrieval miss.

## Product IDs

Facts reference products by stable ID, not display name.

| Product ID | Display name |
|---|---|
| `xt_cdx` | Tempus xT CDx |
| `xr` | Tempus xR |
| `xf` | Tempus xF |
| `xf_plus` | Tempus xF+ |
| `xt_heme` | Tempus xT Heme |

## Fact schema

Every fact is a `###` heading holding a backticked fact ID, followed by these fields:

| Field | Required | Meaning |
|---|---|---|
| `Product` | yes | One or more product IDs, comma separated. |
| `Fact` | yes | Exactly one factual claim, written so it can be quoted directly. |
| `Qualifiers` | yes | Short words or phrases that must be preserved verbatim in any prose citing this fact. `none` when the fact carries no required qualifier. |
| `Measurement` | when relevant | Numbers, units, thresholds, variant classes, laboratories, and cohorts behind the claim. |
| `Timing anchor` | when relevant | The event a duration is measured from, such as specimen retrieval. |
| `Constraints` | yes | Usage limits. Enforced by the safety validator and shown to the rep; not substring matched. |
| `Source` | yes | Official Tempus source URL. |
| `Source section` | yes | The section of that page the claim came from. |
| `Retrieved` | yes | Retrieval date. |

`Qualifiers` and `Constraints` do different jobs.
A qualifier is a word the generated prose must keep, such as `typically`, and dropping it changes the meaning of the claim.
A constraint is a limit on how the fact may be used, such as "not a guaranteed turnaround", and it is enforced by prohibition rules rather than by string matching.

## What this vault deliberately does not contain

The vault holds facts, not sales logic.
It contains no objection-to-fact mappings, physician segments, product-fit scores, prewritten scripts, comparisons, inferred patient-level suitability, or approval labels.
Selecting which fact answers a physician's concern is the model's bounded job at generation time, and it is checked by the validator.

These topics are absent on purpose, and the correct behavior when a physician raises one is to abstain:

- **Pricing, payer coverage, and out-of-pocket exposure.** These require approved internal sources, so no runtime fact can answer them. This is why the reimbursement scenario abstains rather than reaching for an adjacent fact.
- **Competitive comparisons.** These require approved competitive-intelligence sources.
- **Drug approvals and patient-level eligibility.** Out of scope for a sales prototype.
- **Internal turnaround service-level agreements.** The vault carries only the typical expectations stated on public pages.

## Provenance

Facts are curated from `research/tempus_full_claim_inventory.md`, which holds the broader source inventory and is not loaded at runtime.
Source URLs are provenance links.
The application never fetches or interprets a webpage during generation.

Obsidian is an optional authoring and inspection interface for this folder, not a runtime dependency.
