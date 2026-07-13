---
products:
  - id: xf
    name: Tempus xF
  - id: xf_plus
    name: Tempus xF+
modality: blood-based circulating tumor DNA (liquid biopsy)
source_url: https://www.tempus.com/solutions/xf/
retrieved: 2026-07-10
---

# Tempus xF and xF+

Liquid-biopsy ctDNA profiling from a standard blood draw.

## Capability

### `xf-identity-01`

- Product: xf
- Fact: xF is a 105-gene liquid-biopsy ctDNA panel that detects SNVs, INDELs, copy-number gains, and gene rearrangements.
- Qualifiers: none
- Measurement: 105 genes; blood-based circulating tumor DNA.
- Constraints: Detection capability does not establish patient-level suitability or actionability.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Overview
- Retrieved: 2026-07-10

### `xf-plus-identity-01`

- Product: xf_plus
- Fact: xF+ is a 523-gene liquid-biopsy panel covering SNVs, INDELs, copy-number gains, and gene rearrangements.
- Qualifiers: none
- Measurement: 523 genes; blood-based circulating tumor DNA.
- Constraints: The source states the gene count and not a comparison, so do not describe this panel as the largest, broadest, or best available.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Overview
- Retrieved: 2026-07-10

### `xf-plus-chip-01`

- Product: xf_plus
- Fact: xF+ identifies variants potentially associated with clonal hematopoiesis.
- Qualifiers: potentially
- Constraints: "Potentially associated" is the source's language and must survive. Do not state that a detected variant is clonal hematopoiesis.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Overview
- Retrieved: 2026-07-10

### `xf-resistance-context-01`

- Product: xf, xf_plus
- Fact: Tempus describes resistance-monitoring contexts for xF and xF+ including EGFR and ALK in lung cancer, ESR1 in breast cancer, BRCA1/2 reversion mutations in ovarian and breast cancer, and anti-EGFR resistance alterations in colorectal cancer.
- Qualifiers: none
- Constraints: This describes the published testing context only. It is not a treatment recommendation and not a promise that any alteration will be found.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Key Features
- Retrieved: 2026-07-10

## Turnaround

### `xf-turnaround-01`

- Product: xf
- Fact: xF results are typically expected within 7 days of specimen retrieval.
- Qualifiers: typically
- Measurement: 7 days.
- Timing anchor: specimen retrieval
- Constraints: This is a typical expectation, not a guaranteed turnaround and not a service-level agreement.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Turnaround Time
- Retrieved: 2026-07-10

### `xf-plus-turnaround-01`

- Product: xf_plus
- Fact: xF+ results are typically expected within 7 to 9 days of specimen retrieval.
- Qualifiers: typically
- Measurement: 7 to 9 days.
- Timing anchor: specimen retrieval
- Constraints: This is a typical expectation, not a guaranteed turnaround and not a service-level agreement.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Turnaround Time
- Retrieved: 2026-07-10

## Ordering

### `xf-ordering-conversion-01`

- Product: xf, xf_plus
- Fact: Tempus describes an automatic conversion option from xT CDx to xF or xF+ when tumor tissue is insufficient.
- Qualifiers: none
- Constraints: This is an ordering option. Do not imply that liquid biopsy universally substitutes for tissue testing.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Ordering Flexibility
- Retrieved: 2026-07-10

## Study evidence

### `xf-study-complementary-01`

- Product: xf
- Fact: In a retrospective metastatic pan-cancer analysis of patients already identified as having actionable variants, 9% had a unique actionable alteration detected in liquid biopsy that was not detected by solid-tumor testing alone.
- Qualifiers: retrospective
- Measurement: 9% of patients with actionable variants; metastatic pan-cancer cohort; LDT-derived data.
- Constraints: Complementary detection does not establish that liquid biopsy replaces tissue testing.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Key Features, reference 4
- Retrieved: 2026-07-10

## Analytical performance

### `xf-perf-snv-chi-01`

- Product: xf
- Fact: In analytical validation at the Chicago laboratory, xF detected SNVs at a variant allele fraction of at least 0.25% with 98.5% sensitivity and greater than 99.9% specificity.
- Qualifiers: analytical validation, variant allele fraction
- Measurement: SNV variant class; Chicago laboratory; limit of detection 0.25% variant allele fraction.
- Constraints: Sensitivity and specificity are analytical agreement measures, not patient-outcome rates.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Test Design
- Retrieved: 2026-07-10

### `xf-perf-rearrangement-chi-01`

- Product: xf
- Fact: In analytical validation at the Chicago laboratory, xF detected rearrangements at a variant allele fraction of at least 1% with 94.4% sensitivity and greater than 99.9% specificity.
- Qualifiers: analytical validation, variant allele fraction
- Measurement: Rearrangement variant class; Chicago laboratory; limit of detection 1% variant allele fraction.
- Constraints: Sensitivity and specificity are analytical agreement measures, not patient-outcome rates.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Test Design
- Retrieved: 2026-07-10

### `xf-plus-perf-snv-enhanced-chi-01`

- Product: xf_plus
- Fact: In analytical validation at the Chicago laboratory, xF+ detected enhanced SNVs at a variant allele fraction of at least 0.2% with 98.3% sensitivity and greater than 99.9% specificity.
- Qualifiers: analytical validation, variant allele fraction
- Measurement: Enhanced SNV variant class; Chicago laboratory; limit of detection 0.2% variant allele fraction.
- Constraints: Sensitivity and specificity are analytical agreement measures, not patient-outcome rates.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Test Design
- Retrieved: 2026-07-10

### `xf-plus-perf-btmb-chi-01`

- Product: xf_plus
- Fact: In analytical validation, xF+ reported blood tumor mutational burden with 63.6% sensitivity and 98.3% specificity, and Tempus states that blood tumor mutational burden is reported only for samples run in the Chicago laboratory.
- Qualifiers: analytical validation, only for samples run in the Chicago laboratory
- Measurement: bTMB; Chicago laboratory; limit of detection not stated.
- Constraints: Sensitivity and specificity are analytical agreement measures, not patient-outcome rates. This is the lowest-sensitivity measure on the page, so do not present it as a headline capability.
- Source: https://www.tempus.com/solutions/xf/
- Source section: Test Design
- Retrieved: 2026-07-10
