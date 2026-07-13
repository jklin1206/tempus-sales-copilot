---
knowledge_base_id: tempus-public-oncology-demo
version: 1
retrieved_date: 2026-07-10
scope: selected public Tempus oncology test capabilities and performance evidence
runtime_policy: only claims marked sales_safe may be used in generated sales copy
---

# Tempus Product Knowledge Research Inventory

This is the broader research inventory used to curate the prototype's smaller
runtime product-knowledge input. It is not loaded by the application. Source
URLs are provenance links; the runtime must not fetch or interpret webpages
during generation.

This file is a sales-demo aid, not medical advice and not an internally
approved Tempus sales-enablement artifact. Product claims require internal
medical, legal, regulatory, and commercial review before production use.

## Claim-use policy

- `sales_safe`: May be used in generated copy when every listed qualifier is preserved.
- `technical_only`: May appear in the evidence drawer, but not in the default elevator pitch or objection response.
- `study_qualified`: May be used only with the listed cohort, comparison, and study qualifiers.
- `needs_review`: Must not reach generation.
- A claim's tags support retrieval; they do not establish patient-level suitability.
- The generator must return claim IDs. It may not create new product facts.
- If no eligible claim addresses an objection, the system must abstain.

## Source registry

### `source-xt-cdx`

- Title: Tempus xT CDx FDA-approved molecular profiling for solid tumors + xR
- URL: https://www.tempus.com/solutions/xt-cdx/
- Retrieved: 2026-07-10
- Relevant sections: Overview, Key Features, Ordering Flexibility, Test Design, References

### `source-xf`

- Title: Tempus xF/xF+ liquid biopsy
- URL: https://www.tempus.com/solutions/xf/
- Retrieved: 2026-07-10
- Relevant sections: Overview, Key Features, Turnaround Time, Ordering Flexibility, Test Design, References

### `source-xt-heme`

- Title: Tempus xT DNA sequencing for solid tumors or hematologic malignancies + xR
- URL: https://www.tempus.com/solutions/xt/
- Retrieved: 2026-07-10
- Relevant sections: Overview, Key Features, How to Order, References

### `source-testing-resources`

- Title: Testing resources by cancer type
- URL: https://www.tempus.com/solutions/testing-resources/
- Retrieved: 2026-07-10
- Relevant sections: Comprehensive Therapy Selection, Curated Biomarker Tests, Conversion Process

### `source-cdx`

- Title: Companion diagnostics development and CDx services
- URL: https://www.tempus.com/solutions/cdx/
- Retrieved: 2026-07-10
- Relevant sections: Companion Diagnostic Development, Regulatory Milestones

---

## Product family: xT CDx + xR

### Retrieval metadata

- Panel IDs: `xt_cdx`, `xr`
- Modalities: tissue DNA sequencing; whole-transcriptome RNA sequencing
- Clinical-context tags: solid tumors, colorectal cancer, NSCLC, fusion-driven tumors, tissue profiling
- Objection tags: breadth, fusion detection, tissue insufficiency, DNA versus RNA, analytical performance

### Sales-safe capability claims

#### `xt-cdx-identity-01`

- Status: `sales_safe`
- Normalized claim: xT CDx is an FDA-approved 648-gene tissue-based NGS test for molecular profiling of malignant solid tumors.
- Important qualifiers: Companion diagnostic claims are specific to approved indications; the public overview specifically notes colorectal cancer claims.
- Supports: breadth, tissue profiling, FDA status
- Source: `source-xt-cdx`, Overview

#### `xt-cdx-specimen-01`

- Status: `sales_safe`
- Normalized claim: xT CDx uses DNA from FFPE tumor tissue together with matched normal blood or saliva.
- Important qualifiers: Describe specimen inputs only; do not imply suitability for a specific patient.
- Supports: specimen requirements, tumor-normal workflow
- Source: `source-xt-cdx`, Intended Use statement

#### `xr-capability-01`

- Status: `sales_safe`
- Normalized claim: xR provides whole-transcriptome RNA sequencing for solid tumors and hematologic malignancies and reports clinically relevant fusions across more than 100 targeted genes, along with altered-splicing events including MET exon 14 and EGFRvIII.
- Important qualifiers: “Clinically relevant” follows the definition on the source page; do not convert this into a treatment recommendation.
- Supports: fusion detection, DNA versus RNA, gene coverage
- Source: `source-xt-cdx`, Overview

#### `xt-xf-conversion-01`

- Status: `sales_safe`
- Normalized claim: Tempus describes an automatic conversion option from xT CDx to xF liquid biopsy when tissue is insufficient.
- Important qualifiers: This is an ordering option, not a claim that liquid biopsy always replaces tissue testing.
- Supports: insufficient tissue, repeat-biopsy concern, workflow
- Source: `source-xt-cdx`, Ordering Flexibility

### Study-qualified outcome claims

#### `xt-xr-study-targeted-therapy-01`

- Status: `study_qualified`
- Normalized claim: On the cited public page, 43.4% of patients in a retrospective LDT-derived cohort were matched to a targeted therapy when DNA sequencing was combined with RNA sequencing and immunotherapy biomarker results.
- Required qualifiers: retrospective study; selected multi-tumor cohort; LDT-derived data; matching does not establish treatment receipt or outcome.
- Supports: combined DNA and RNA evidence
- Source: `source-xt-cdx`, Key Features, reference 1

#### `xr-study-fusion-uplift-01`

- Status: `study_qualified`
- Normalized claim: Among patients with identified fusions in the cited retrospective analysis, incorporating RNA sequencing identified 29% more patients with a unique clinically actionable fusion match than DNA sequencing alone.
- Required qualifiers: applies to patients with identified fusions; retrospective cohort; LDT-derived data; fusion prevalence in the underlying sample set was 2.5%.
- Supports: fusion detection, DNA versus RNA
- Source: `source-xt-cdx`, Key Features, reference 2

#### `xt-study-false-positive-01`

- Status: `study_qualified`
- Normalized claim: The cited retrospective analysis reports a 28% reduction in somatic false-positive calls with tumor-normal matched testing compared with tumor-only analysis.
- Required qualifiers: retrospective LDT-derived analysis; comparison is tumor-normal matched versus tumor-only calling.
- Supports: tumor-normal workflow, analytical accuracy
- Source: `source-xt-cdx`, Key Features, reference 1

#### `xt-study-clinical-trial-01`

- Status: `study_qualified`
- Normalized claim: The cited retrospective analysis reports that 96% of patients were matched to a clinical trial when clinical data was combined with Tempus NGS.
- Required qualifiers: matching is not enrollment; retrospective multi-tumor cohort; LDT-derived data.
- Supports: clinical-trial matching conversation
- Source: `source-xt-cdx`, Key Features, reference 1

### Technical analytical-performance evidence

The following values belong in a technical evidence drawer. They must retain
variant class, laboratory, PPA/NPA terminology, and validation context.

| Claim ID | Assay / lab | Variant class | PPA | NPA | Status |
|---|---|---|---:|---:|---|
| `xt-perf-snv-chi-01` | xT CDx / Chicago | SNV | 99.2% | 100.0% | technical_only |
| `xt-perf-mnv-chi-01` | xT CDx / Chicago | MNV | 94.7% | 100.0% | technical_only |
| `xt-perf-insertion-chi-01` | xT CDx / Chicago | Insertion | 96.7% | 100.0% | technical_only |
| `xt-perf-deletion-chi-01` | xT CDx / Chicago | Deletion | 100.0% | 100.0% | technical_only |
| `xt-perf-msi-chi-01` | xT CDx / Chicago | MSI | 94.0% | 98.0% | technical_only |
| `xr-perf-fusion-targeted-chi-01` | xR LDT / Chicago | Targeted rearrangements/fusions | 100.0% | 99.0% | technical_only |
| `xr-perf-fusion-untargeted-chi-01` | xR LDT / Chicago | Untargeted rearrangements/fusions | 97.0% | 99.0% | technical_only |
| `xr-perf-met14-chi-01` | xR LDT / Chicago | MET exon 14 altered splicing | 100.0% | 100.0% | technical_only |
| `xr-perf-egfrviii-chi-01` | xR LDT / Chicago | EGFRvIII altered splicing | 95.5% | 91.3% | technical_only |
| `xr-perf-fusion-targeted-dur-01` | xR LDT / Durham | Targeted rearrangements/fusions | 96.8% | 99.9% | technical_only |
| `xr-perf-fusion-untargeted-dur-01` | xR LDT / Durham | Untargeted rearrangements/fusions | 100.0% | 99.9% | technical_only |

- Source for all rows: `source-xt-cdx`, Test Design.
- Required qualifier: PPA/NPA are analytical agreement measures, not patient-outcome rates.

---

## Product family: xF + xF+

### Retrieval metadata

- Panel IDs: `xf`, `xf_plus`
- Modality: blood-based circulating tumor DNA liquid biopsy
- Clinical-context tags: advanced solid tumors, tissue insufficient, repeat biopsy, resistance monitoring, lung cancer, breast cancer, ovarian cancer, colorectal cancer
- Objection tags: turnaround time, blood-based testing, gene breadth, tissue insufficiency, resistance, analytical performance

### Sales-safe capability and operational claims

#### `xf-identity-01`

- Status: `sales_safe`
- Normalized claim: xF is a 105-gene liquid-biopsy ctDNA panel that detects SNVs, INDELs, copy-number gains, and gene rearrangements.
- Important qualifiers: Detection capability does not establish patient-level suitability or actionability.
- Supports: liquid biopsy, gene breadth, alteration coverage
- Source: `source-xf`, Overview

#### `xf-plus-identity-01`

- Status: `sales_safe`
- Normalized claim: xF+ is a 523-gene liquid-biopsy panel covering SNVs, INDELs, copy-number gains, and gene rearrangements and identifying variants potentially associated with clonal hematopoiesis.
- Important qualifiers: Do not use unsupported “largest panel” language; the current source page states the gene count but not that comparative claim.
- Supports: liquid biopsy, gene breadth, alteration coverage
- Source: `source-xf`, Overview

#### `xf-turnaround-01`

- Status: `sales_safe`
- Normalized claim: xF results are typically expected within 7 days of specimen retrieval.
- Value: 7
- Unit: days
- Measurement start: specimen retrieval
- Important qualifiers: Typical expectation, not a guaranteed SLA.
- Supports: turnaround time
- Source: `source-xf`, Turnaround Time

#### `xf-plus-turnaround-01`

- Status: `sales_safe`
- Normalized claim: xF+ results are typically expected within 7–9 days of specimen retrieval.
- Value: 7–9
- Unit: days
- Measurement start: specimen retrieval
- Important qualifiers: Typical expectation, not a guaranteed SLA.
- Supports: turnaround time
- Source: `source-xf`, Turnaround Time

#### `xf-resistance-context-01`

- Status: `sales_safe`
- Normalized claim: The public page describes xF/xF+ resistance-monitoring contexts including EGFR and ALK in lung cancer, ESR1 in breast cancer, BRCA1/2 reversion mutations in ovarian and breast cancer, and anti-EGFR resistance alterations in colorectal cancer.
- Important qualifiers: Describe the published testing context, not a treatment recommendation or guaranteed finding.
- Supports: resistance monitoring, lung, breast, ovarian, colorectal
- Source: `source-xf`, Key Features

#### `xf-ordering-conversion-01`

- Status: `sales_safe`
- Normalized claim: Tempus describes an automatic conversion option from xT CDx to xF or xF+ when tumor tissue is insufficient.
- Important qualifiers: Ordering option only; do not imply universal substitution for tissue.
- Supports: insufficient tissue, repeat-biopsy concern, workflow
- Source: `source-xf`, Ordering Flexibility

#### `xf-financial-assistance-01`

- Status: `sales_safe`
- Normalized claim: Tempus states that U.S.-based patients may apply for financial assistance and that approved applicants are informed of the maximum out-of-pocket cost at the time of the decision.
- Important qualifiers: Do not promise approval, coverage, or a specific price; route detailed reimbursement questions to the appropriate Tempus resource.
- Supports: cost and reimbursement
- Source: `source-xf`, Financial Assistance

### Study-qualified evidence

#### `xf-study-complementary-01`

- Status: `study_qualified`
- Normalized claim: In the cited metastatic pan-cancer analysis, 9% of patients with actionable variants had a unique actionable alteration detected in liquid biopsy that was not detected in solid-tumor testing alone.
- Required qualifiers: retrospective analysis; metastatic pan-cancer cohort; patients already identified as having actionable variants; complementary detection does not establish that liquid biopsy replaces tissue testing.
- Supports: liquid versus tissue, complementary testing
- Source: `source-xf`, Key Features, reference 4

### Technical analytical-performance evidence

| Claim ID | Assay / lab | Variant class / threshold | Sensitivity | Specificity | LOD | Status |
|---|---|---|---:|---:|---:|---|
| `xf-perf-snv-chi-01` | xF / Chicago | SNV at VAF ≥0.25% | 98.5% | >99.9% | 0.25% | technical_only |
| `xf-perf-indel-chi-01` | xF / Chicago | INDEL at VAF ≥0.5% | 98.5% | >99.9% | 0.50% | technical_only |
| `xf-perf-cng-chi-01` | xF / Chicago | CNG at VAF ≥0.5% | >99.9% | 96.2% | 0.50% | technical_only |
| `xf-perf-rearrangement-chi-01` | xF / Chicago | Rearrangement at VAF ≥1% | 94.4% | >99.9% | 1% | technical_only |
| `xf-perf-snv-dur-01` | xF / Durham | SNV at VAF ≥0.25% | 99.6% | >99.9% | 0.25% | technical_only |
| `xf-perf-indel-dur-01` | xF / Durham | INDEL at VAF ≥0.5% | 99.5% | >99.9% | 0.50% | technical_only |
| `xf-plus-perf-snv-enhanced-chi-01` | xF+ / Chicago | Enhanced SNV at VAF ≥0.2% | 98.3% | >99.9% | 0.2% | technical_only |
| `xf-plus-perf-indel-enhanced-chi-01` | xF+ / Chicago | Enhanced INDEL at VAF ≥0.25% | 95.5% | >99.9% | 0.25% | technical_only |
| `xf-plus-perf-rearrangement-chi-01` | xF+ / Chicago | Rearrangement at VAF ≥1% | 96.8% | >99.9% | 1% | technical_only |
| `xf-plus-perf-msi-chi-01` | xF+ / Chicago | MSI-H | 90.0% | >99.9% | not stated | technical_only |
| `xf-plus-perf-btmb-chi-01` | xF+ / Chicago | bTMB | 63.6% | 98.3% | not stated | technical_only |

- Source for all rows: `source-xf`, Test Design.
- Required qualifier: sensitivity/specificity values are assay-, lab-, threshold-, and variant-class-specific.
- Additional qualifier: the source states that bTMB is reported only for samples run in the Chicago laboratory.

---

## Product family: xT Heme + xR

### Retrieval metadata

- Panel IDs: `xt_heme`, `xr`
- Modalities: 648-gene DNA sequencing and whole-transcriptome RNA sequencing
- Clinical-context tags: hematologic malignancies, heme, fusion detection, diagnosis, risk stratification
- Objection tags: breadth, turnaround time, fusion detection

#### `xt-heme-identity-01`

- Status: `sales_safe`
- Normalized claim: Tempus describes xT Heme + xR as a combined 648-gene DNA and whole-transcriptome RNA assessment for hematologic malignancies, including validated fusion detection and diagnostic, prognostic, and therapeutic-matching considerations.
- Important qualifiers: Use “considerations” and “matching options”; do not imply a treatment recommendation or outcome.
- Supports: heme product explanation, DNA plus RNA, breadth
- Source: `source-xt-heme`, Overview

#### `xt-heme-turnaround-01`

- Status: `sales_safe`
- Normalized claim: The public xT Heme page states a turnaround time of 9 days from specimen receipt.
- Value: 9
- Unit: days
- Measurement start: specimen receipt
- Important qualifiers: Public product-page statement; do not convert into a guaranteed SLA.
- Supports: turnaround time
- Source: `source-xt-heme`, How to Order

#### `xt-heme-fusion-definition-01`

- Status: `technical_only`
- Normalized claim: The source defines validated fusion detection as whole-transcriptome RNA analysis and/or examination of 22 specific genes through DNA sequencing.
- Important qualifiers: Technical definition only; retain the “and/or” construction.
- Supports: fusion detection
- Source: `source-xt-heme`, footnote

---

## Test-selection and cancer-context evidence

These records support retrieval and conversation planning. They must not be
presented as patient-level ordering recommendations.

#### `cts-solid-tumor-bundle-01`

- Status: `sales_safe`
- Normalized claim: Tempus states that Comprehensive Therapy Selection orders for solid tumors include xT CDx DNA sequencing, xR RNA sequencing, and a curated selection of biomarker tests based on cancer type.
- Important qualifiers: Product bundle description, not patient-specific advice.
- Supports: combined testing, product-selection explanation
- Source: `source-testing-resources`, Comprehensive Therapy Selection

#### `cts-heme-bundle-01`

- Status: `sales_safe`
- Normalized claim: Tempus states that Comprehensive Therapy Selection for hematologic malignancies includes xT Heme DNA sequencing and xR RNA sequencing.
- Important qualifiers: Product bundle description, not patient-specific advice.
- Supports: heme testing conversation
- Source: `source-testing-resources`, Comprehensive Therapy Selection

#### `cts-breast-context-01`

- Status: `sales_safe`
- Normalized claim: The public testing-resources table lists HER2 and PD-L1 22C3 among curated biomarker tests for breast cancer, with algorithmic tests including HRD, DPYD, IPS, and UGT1A1.
- Important qualifiers: Availability and ordering conditions vary; consult the source and current ordering guidance.
- Supports: breast oncology context
- Source: `source-testing-resources`, Curated Biomarker Tests

#### `cts-colorectal-context-01`

- Status: `sales_safe`
- Normalized claim: The public testing-resources table lists HER2 and MMR among curated biomarker tests for colorectal cancer, with algorithmic tests including DPYD, IPS, and UGT1A1.
- Important qualifiers: Availability and ordering conditions vary; consult the source and current ordering guidance.
- Supports: colorectal oncology context
- Source: `source-testing-resources`, Curated Biomarker Tests

#### `cts-nsclc-context-01`

- Status: `sales_safe`
- Normalized claim: The public testing-resources table lists HER2, PD-L1 22C3, and c-MET among curated biomarker tests for non-small cell lung cancer, with IPS listed as an algorithmic test.
- Important qualifiers: Availability and ordering conditions vary; consult the source and current ordering guidance.
- Supports: NSCLC context
- Source: `source-testing-resources`, Curated Biomarker Tests

---

## Product milestones

Product milestones can contribute to a dated “Why now” statement when they are
relevant to the provider conversation. They are not new-drug approvals.

#### `milestone-xt-cdx-fda-01`

- Status: `sales_safe`
- Date: 2023-04
- Normalized claim: Tempus lists xT CDx DNA as FDA-approved in April 2023.
- Important qualifiers: Product regulatory milestone; not a therapy approval.
- Source: `source-cdx`, Regulatory Milestones

#### `milestone-xr-ivd-fda-01`

- Status: `sales_safe`
- Date: 2025-09
- Normalized claim: Tempus lists xR IVD RNA as FDA-cleared in September 2025.
- Important qualifiers: Product regulatory milestone; confirm current labeling before production use.
- Source: `source-cdx`, Regulatory Milestones

---

## Objection-to-claim map

| Objection category | Preferred sales-safe claims | Optional supporting evidence |
|---|---|---|
| turnaround_time | `xf-turnaround-01`, `xf-plus-turnaround-01`, `xt-heme-turnaround-01` | none |
| insufficient_tissue | `xt-xf-conversion-01`, `xf-ordering-conversion-01` | `xf-study-complementary-01` |
| blood_based_testing | `xf-identity-01`, `xf-plus-identity-01` | `xf-study-complementary-01` |
| gene_breadth | `xt-cdx-identity-01`, `xf-identity-01`, `xf-plus-identity-01`, `xr-capability-01` | technical performance table rows |
| fusion_detection | `xr-capability-01` | `xr-study-fusion-uplift-01`, xR technical performance rows |
| resistance_monitoring | `xf-resistance-context-01` | `xf-study-complementary-01` |
| cost_reimbursement | `xf-financial-assistance-01` | none; abstain from pricing or coverage promises |
| competitor_comparison | none | always abstain |
| guaranteed_outcome | none | always abstain |

## Runtime context contract

The context builder should send only the selected provider record, that
provider's CRM note, and a small allowlist of claims selected from this file.

```json
{
  "provider_id": "p02",
  "crm_concern": "turnaround_time",
  "conversation_angle": "liquid biopsy turnaround",
  "allowed_claim_ids": ["xf-identity-01", "xf-turnaround-01"],
  "required_qualifiers": [
    "typical expectation",
    "not a guaranteed SLA",
    "measured from specimen retrieval"
  ]
}
```

The generator must return the claim IDs it used. The validator must reject
unknown claims, cross-panel leakage, altered numeric values or units, removed
qualifiers, unsupported product comparisons, and patient-level advice.

## Deliberate evidence gaps

The following data does not belong in this product KB and must not be invented:

- Provider-level testing volume: belongs in mock market intelligence if the prototype includes it.
- New drug approvals: require a separate, dated, primary-source catalyst record, typically from FDA or the therapy manufacturer.
- Internal turnaround SLAs, pricing, payer coverage, and account contracts: require approved internal sources.
- Competitive comparisons: require approved competitive-intelligence sources.
- Patient-level eligibility: out of scope for a sales prototype.

## Prototype coverage statement

This KB intentionally covers a representative subset of Tempus oncology
capabilities. It is sized to prove claim selection, metric-aware objection
handling, grounded synthesis, citation, qualification, and abstention. It is
not a complete representation of Tempus's commercial catalog.
