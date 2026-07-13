---
products:
  - id: xt_cdx
    name: Tempus xT CDx
modality: tissue DNA sequencing (FFPE tumor tissue with matched normal)
source_url: https://www.tempus.com/solutions/xt-cdx/
retrieved: 2026-07-10
---

# Tempus xT CDx

FDA-approved tissue-based molecular profiling for solid tumors.
Facts that describe the combined DNA and RNA offering also carry the `xr` product ID.

## Capability

### `xt-cdx-identity-01`

- Product: xt_cdx
- Fact: xT CDx is an FDA-approved 648-gene tissue-based next-generation sequencing test for molecular profiling of malignant solid tumors.
- Qualifiers: none
- Measurement: 648 genes; tissue-based next-generation sequencing.
- Constraints: Companion diagnostic claims are specific to approved indications, and the public overview specifically notes colorectal cancer claims. Do not extend companion-diagnostic status to other indications, and do not present FDA approval of the test as approval of any therapy.
- Source: https://www.tempus.com/solutions/xt-cdx/
- Source section: Overview
- Retrieved: 2026-07-10

### `xt-cdx-specimen-01`

- Product: xt_cdx
- Fact: xT CDx uses DNA from FFPE tumor tissue together with matched normal blood or saliva.
- Qualifiers: none
- Measurement: FFPE tumor tissue plus matched normal blood or saliva.
- Constraints: Describes specimen inputs only. Do not imply suitability for a specific patient.
- Source: https://www.tempus.com/solutions/xt-cdx/
- Source section: Intended Use statement
- Retrieved: 2026-07-10

### `cts-solid-tumor-bundle-01`

- Product: xt_cdx, xr
- Fact: Tempus states that Comprehensive Therapy Selection orders for solid tumors include xT CDx DNA sequencing, xR RNA sequencing, and a curated selection of biomarker tests based on cancer type.
- Qualifiers: none
- Constraints: This is a product bundle description, not patient-specific advice. Availability and ordering conditions vary.
- Source: https://www.tempus.com/solutions/testing-resources/
- Source section: Comprehensive Therapy Selection
- Retrieved: 2026-07-10

## Ordering

### `xt-xf-conversion-01`

- Product: xt_cdx, xf
- Fact: Tempus describes an automatic conversion option from xT CDx to xF liquid biopsy when tissue is insufficient.
- Qualifiers: none
- Constraints: This is an ordering option, not a claim that liquid biopsy always replaces tissue testing.
- Source: https://www.tempus.com/solutions/xt-cdx/
- Source section: Ordering Flexibility
- Retrieved: 2026-07-10

## Study evidence

### `xt-xr-study-targeted-therapy-01`

- Product: xt_cdx, xr
- Fact: In a retrospective multi-tumor cohort, 43.4% of patients were matched to a targeted therapy when DNA sequencing was combined with RNA sequencing and immunotherapy biomarker results.
- Qualifiers: retrospective, matched
- Measurement: 43.4% of patients; retrospective selected multi-tumor cohort; LDT-derived data.
- Constraints: Matching does not establish that a patient received the therapy or benefited from it.
- Source: https://www.tempus.com/solutions/xt-cdx/
- Source section: Key Features, reference 1
- Retrieved: 2026-07-10

### `xt-study-false-positive-01`

- Product: xt_cdx
- Fact: A retrospective analysis reports a 28% reduction in somatic false-positive calls with tumor-normal matched testing compared with tumor-only analysis.
- Qualifiers: retrospective
- Measurement: 28% reduction; comparison is tumor-normal matched calling versus tumor-only calling; LDT-derived data.
- Constraints: The comparison is between two calling approaches, not between Tempus and another laboratory or vendor.
- Source: https://www.tempus.com/solutions/xt-cdx/
- Source section: Key Features, reference 1
- Retrieved: 2026-07-10

### `xt-study-clinical-trial-01`

- Product: xt_cdx
- Fact: A retrospective analysis reports that 96% of patients were matched to a clinical trial when clinical data was combined with Tempus next-generation sequencing.
- Qualifiers: retrospective, matched
- Measurement: 96% of patients; retrospective multi-tumor cohort; LDT-derived data.
- Constraints: Matching to a trial is not enrollment in a trial.
- Source: https://www.tempus.com/solutions/xt-cdx/
- Source section: Key Features, reference 1
- Retrieved: 2026-07-10

## Analytical performance

### `xt-perf-snv-chi-01`

- Product: xt_cdx
- Fact: In analytical validation at the Chicago laboratory, xT CDx reported 99.2% positive percent agreement and 100.0% negative percent agreement for SNVs.
- Qualifiers: analytical validation, percent agreement
- Measurement: SNV variant class; Chicago laboratory.
- Constraints: Positive and negative percent agreement are analytical agreement measures, not patient-outcome rates.
- Source: https://www.tempus.com/solutions/xt-cdx/
- Source section: Test Design
- Retrieved: 2026-07-10

### `xt-perf-msi-chi-01`

- Product: xt_cdx
- Fact: In analytical validation at the Chicago laboratory, xT CDx reported 94.0% positive percent agreement and 98.0% negative percent agreement for microsatellite instability.
- Qualifiers: analytical validation, percent agreement
- Measurement: MSI variant class; Chicago laboratory.
- Constraints: Positive and negative percent agreement are analytical agreement measures, not patient-outcome rates.
- Source: https://www.tempus.com/solutions/xt-cdx/
- Source section: Test Design
- Retrieved: 2026-07-10

## Regulatory milestone

### `milestone-xt-cdx-fda-01`

- Product: xt_cdx
- Fact: Tempus lists xT CDx DNA as FDA-approved in April 2023.
- Qualifiers: none
- Measurement: April 2023.
- Constraints: This is a product regulatory milestone, not a therapy approval.
- Source: https://www.tempus.com/solutions/cdx/
- Source section: Regulatory Milestones
- Retrieved: 2026-07-10
