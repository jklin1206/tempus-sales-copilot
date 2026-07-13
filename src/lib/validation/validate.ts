import type { ModelBrief } from "../brief/schema";
import type { CrmNote, ProductFact } from "../types";

/**
 * Programmatic factual and safety validation (SPEC.md 11.3).
 *
 * This runs on every generated brief and it is blocking. Any critical failure blocks
 * the generated prose: the safe result is an explicit unavailable state, never a
 * partially grounded pitch.
 *
 * Deliberately not an LLM. A model checking another model's grounding gives you two
 * things that can hallucinate instead of one. Every rule here is mechanical and, when
 * it fires, it can point at the exact fact it disagrees with.
 */

export interface ValidationResult {
  ok: boolean;
  passed: string[];
  failed: string[];
  citedFactIds: string[];
}

const SCRIPT_MIN_WORDS = 65;
const SCRIPT_MAX_WORDS = 80;
const SNAPSHOT_MIN_FACTS = 2;
const SNAPSHOT_MAX_FACTS = 4;
const SCRIPT_MAX_FACTS = 2;

/**
 * Normalizes typographic variants before matching.
 *
 * The model writes non-breaking hyphens, en dashes, and curly quotes. Without this, a
 * brief that reproduces a CRM sentence perfectly fails the exact-substring check because
 * it used U+2011 instead of "-", and a preserved qualifier goes undetected for the same
 * reason. Glyphs are normalized; wording never is, so a paraphrase still fails.
 */
function normalize(text: string): string {
  return text
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Removes explicit disclaimers before the prohibition patterns run.
 *
 * A brief that writes "this is a typical expectation, NOT a guaranteed turnaround" is doing
 * precisely what the prohibition exists to enforce. Matching the bare phrase blocks it, which
 * is backwards: the model gets punished for saying the safe thing out loud.
 *
 * This is the third time this exact bug class has appeared, and each time the fix was to make
 * the check look for an ASSERTION rather than a SUBJECT:
 *
 *   1. Pricing fired on "I cannot give you out-of-pocket costs".
 *   2. The eval fired on "a typical expectation, not a guarantee".
 *   3. Turnaround fired on "not a guaranteed turnaround and not a service-level agreement".
 *
 * So it is handled once, structurally, rather than patched into each pattern: strip the
 * negated constructions first, then look for what remains. "We guarantee 7 days" survives the
 * strip and is still blocked. "Not a guaranteed turnaround" does not survive, and is allowed.
 */
const DISCLAIMER = /\b(?:not|never|no|rather than|isn't|is not|aren't|are not|without)\s+(?:a|an|any)?\s*(?:guaranteed?|guarantee|promised?|promise|assured|assurance|commitment|sla|service[- ]level agreement)\b/gi;

export function stripDisclaimers(text: string): string {
  return text.replace(DISCLAIMER, " ");
}

/**
 * Phrases that must never appear in generated prose, whatever the facts say.
 *
 * These are the claims a rep cannot walk back: a promised turnaround, a swipe at a
 * competitor, a therapy-approval implication, or advice about a patient. The vault
 * carries no fact that could support any of them, so their presence means the model
 * went beyond its evidence.
 *
 * Every pattern here matches an ASSERTION, never a topic. A brief that says "I cannot
 * give you out-of-pocket costs" is doing exactly the right thing, and an earlier version
 * of these rules blocked it for naming the subject it was declining to discuss. Naming a
 * concern is how you abstain from it.
 */
const PROHIBITED_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  {
    code: "guaranteed_turnaround",
    pattern: /\b(guarantee[ds]?|guaranteeing|promise[ds]?|always|every time|never late|sla)\b[^.]{0,40}\b(turnaround|results?|days?|deliver)/i,
  },
  {
    code: "guaranteed_turnaround",
    pattern: /\b(results?|turnaround)\b[^.]{0,40}\b(guarantee[ds]?|promised|assured|within exactly)\b/i,
  },
  {
    code: "unsupported_superiority",
    pattern: /\b(better than|faster than|broader than|superior to|outperforms?|beats?|more accurate than|the (largest|broadest|best|fastest|most comprehensive))\b/i,
  },
  {
    code: "competitor_assertion",
    pattern: /\b(foundation ?(one|medicine)|guardant|caris|natera|exact sciences|illumina|neogenomics|competitor'?s? (test|panel|assay))\b/i,
  },
  {
    code: "drug_approval_claim",
    pattern: /\b(fda[- ]approved|approved by the fda|newly approved|cleared)\b[^.]{0,30}\b(therapy|drug|treatment|regimen)\b/i,
  },
  {
    code: "clinical_recommendation",
    pattern: /\b(you should (order|test|treat|prescribe)|we recommend (ordering|testing|treating)|the patient should|patients? (should|must) (receive|be treated|be tested)|is indicated for (this|the) patient|eligible for treatment)\b/i,
  },
  {
    code: "pricing_or_coverage_claim",
    // Matches a stated price or a definitive coverage assertion. Does NOT match the
    // mere words "cost" or "reimbursement", because the abstention has to be able to
    // name what it is declining to answer.
    pattern:
      /\$\s?\d|\b(costs?|priced)\s+(is|are|at|around|about)?\s?\$?\d|\b(copay|coinsurance|deductible)\s+(is|of)\b|\bout-of-pocket\s+(is|will be|amounts? to)\b|\b(is|are)\s+(fully\s+)?covered by\s+(medicare|medicaid|insurance|payers?|most)\b|\breimbursed at\b|\bno cost to (the )?patients?\b|\bfree of charge\b/i,
  },
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Numeric tokens the prose is allowed to use.
 *
 * Any number in generated prose must trace to a cited fact, so a fabricated "99%" or a
 * turnaround silently changed from 7 days to 3 cannot survive.
 *
 * Two kinds of digits are NOT numeric claims and must be removed before the comparison:
 *
 *   Gene and variant names: BRCA1, PD-L1, EGFRvIII, MET exon 14.
 *   Fact IDs: a brief that writes "xf-turnaround-01" inline is citing, not claiming.
 *     Without this, stripping the "xf" left a bare "01" behind, and the validator
 *     reported a fabricated number that no one had written. That bug blocked real,
 *     correctly grounded briefs.
 */
function extractNumbers(text: string, factIds: readonly string[] = []): string[] {
  let cleaned = text;

  // Fact IDs first, before any other rule can chew a prefix off one and strand its digits.
  for (const id of factIds) {
    cleaned = cleaned.split(id).join(" ");
    cleaned = cleaned.split(id.replace(/-/g, "_")).join(" ");
  }

  cleaned = cleaned
    .replace(/\b[A-Z]{2,}[- ]?[A-Z]?\d+\b/g, " ") // BRCA1, PD-L1, EGFRvIII, MET14
    .replace(/\bexon \d+\b/gi, " ")
    .replace(/\bxf\+?\b|\bxt\b|\bxr\b/gi, " ");

  return [...cleaned.matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0]);
}

/** Numbers a cited fact makes available, including its measurement and timing context. */
function allowedNumbers(facts: ProductFact[], crm: CrmNote, allFactIds: readonly string[]): Set<string> {
  const allowed = new Set<string>();

  for (const fact of facts) {
    for (const source of [fact.fact, fact.measurement ?? "", fact.constraints]) {
      for (const number of extractNumbers(source, allFactIds)) {
        allowed.add(number);
        // "7 days" licenses "7", and a fact stating 100.0% licenses a script saying 100%.
        if (number.endsWith(".0")) allowed.add(number.slice(0, -2));
        if (!number.includes(".")) allowed.add(`${number}.0`);
      }
    }
  }

  // The CRM note is the source of any date or figure the rep already knows, so a script may
  // repeat one back: the note body is the physician's own words.
  for (const number of extractNumbers(crm.body, allFactIds)) allowed.add(number);
  for (const number of extractNumbers(crm.lastContact, allFactIds)) allowed.add(number);

  return allowed;
}

/**
 * Resolves a cited fact ID to a real one, tolerating a separator slip.
 *
 * Product IDs use underscores (`xt_heme`) and fact IDs use hyphens (`xt-heme-...`), and
 * the model periodically writes `xt_heme-identity-01`. That names a fact that exists; it
 * just mistypes the separator. Rejecting it as a fabrication would throw away a correct,
 * fully grounded brief over punctuation.
 *
 * This only ever resolves to a fact already in the supplied vault. An ID that names no
 * fact still fails, so nothing invented gets through.
 */
function canonicalFactId(factId: string, factIndex: Map<string, ProductFact>): string {
  if (factIndex.has(factId)) return factId;

  const hyphenated = factId.replace(/_/g, "-");
  return factIndex.has(hyphenated) ? hyphenated : factId;
}

export function validateBrief(
  brief: ModelBrief,
  context: { provider: { physicianId: string }; crm: CrmNote; facts: ProductFact[] },
): ValidationResult {
  const passed: string[] = [];
  const failed: string[] = [];

  const factIndex = new Map(context.facts.map((fact) => [fact.factId, fact]));
  const canon = (id: string) => canonicalFactId(id, factIndex);

  const citedFactIds = [
    ...new Set([
      ...brief.product_snapshot.map((item) => canon(item.fact_id)),
      ...brief.objection_response.fact_ids.map(canon),
      ...brief.meeting_script.fact_ids.map(canon),
    ]),
  ];

  const check = (code: string, ok: boolean) => {
    (ok ? passed : failed).push(code);
    return ok;
  };

  // ---- Identity -----------------------------------------------------------------
  check("physician_id_matches_request", brief.physician_id === context.provider.physicianId);

  // ---- Fact existence (SPEC 11.3) ------------------------------------------------
  const unknownIds = citedFactIds.filter((id) => !factIndex.has(id));
  check("all_cited_facts_exist_in_vault", unknownIds.length === 0);
  if (unknownIds.length > 0) {
    failed.push(`fabricated_fact_ids:${unknownIds.join(",")}`);
  }

  const citedFacts = citedFactIds.map((id) => factIndex.get(id)).filter((f): f is ProductFact => Boolean(f));

  // ---- Product IDs agree with the facts they cite --------------------------------
  const factProductIds = new Set(citedFacts.flatMap((fact) => fact.productIds));
  check(
    "product_ids_agree_with_cited_facts",
    citedFacts.length === 0 || brief.product_ids.every((id) => factProductIds.has(id)),
  );

  // ---- CRM excerpt is an exact quote ---------------------------------------------
  // Whitespace and typographic glyphs are normalized on both sides, so a wrapped line
  // or a curly apostrophe does not fail an otherwise verbatim quote. Wording is never
  // normalized: a paraphrase still fails.
  const excerptIsExact = normalize(context.crm.body).includes(normalize(brief.supporting_crm_excerpt));
  check("crm_excerpt_is_exact_substring", excerptIsExact);

  // ---- Cross-provider leakage ----------------------------------------------------
  // The excerpt must come from THIS physician's note, which the substring check above
  // already guarantees, since only one note is ever loaded into the context.
  check("no_cross_provider_crm_leakage", excerptIsExact);

  // ---- Snapshot display text is faithful to its fact ------------------------------
  /** A qualifier survives if ANY of its accepted surface forms appears in the text. */
  const qualifiersSurvive = (fact: ProductFact, text: string): boolean => {
    const haystack = normalize(text).toLowerCase();
    return fact.qualifiers.every((alternates) =>
      alternates.some((form) => haystack.includes(normalize(form).toLowerCase())),
    );
  };

  for (const item of brief.product_snapshot) {
    const factId = canon(item.fact_id);
    const fact = factIndex.get(factId);
    if (!fact) continue;

    check(`qualifiers_preserved:${factId}`, qualifiersSurvive(fact, item.display_text));
  }

  // ---- Qualifiers survive in the prose that cites the fact -------------------------
  // The check code names WHERE it ran. The objection response and the script routinely
  // cite the same fact, so a code that named only the fact produced two identical entries
  // in the trace, and told the reader nothing about which passage dropped the qualifier.
  const proseCiting = (where: string, factIds: string[], text: string) => {
    for (const id of factIds) {
      const factId = canon(id);
      const fact = factIndex.get(factId);
      if (!fact) continue;
      check(`qualifiers_preserved_in_${where}:${factId}`, qualifiersSurvive(fact, text));
    }
  };
  proseCiting("objection", brief.objection_response.fact_ids, brief.objection_response.text);
  proseCiting("script", brief.meeting_script.fact_ids, brief.meeting_script.text);

  // ---- Numbers trace back to a cited fact -------------------------------------------
  // Every fact ID in the vault is stripped from the prose first, not just the cited
  // ones: an ID written inline is a citation, and its trailing "-01" is not a claim.
  const allFactIds = context.facts.map((fact) => fact.factId);
  const allowed = allowedNumbers(citedFacts, context.crm, allFactIds);

  // why_tempus is rep-facing prose and can carry a product claim, so it is held to the
  // same standard as the objection response and the script. Every sentence the rep might
  // repeat out loud goes through the same checks.
  const prose = [
    brief.why_tempus,
    brief.objection_response.text,
    brief.meeting_script.text,
    ...brief.product_snapshot.map((item) => item.display_text),
  ].join(" ");

  const fabricatedNumbers = extractNumbers(prose, allFactIds).filter((number) => !allowed.has(number));
  check("numbers_trace_to_cited_facts", fabricatedNumbers.length === 0);
  if (fabricatedNumbers.length > 0) {
    failed.push(`fabricated_numbers:${[...new Set(fabricatedNumbers)].join(",")}`);
  }

  // ---- Prohibited claims --------------------------------------------------------------
  // Disclaimers are stripped first, so "not a guaranteed turnaround" is read as the honest
  // hedge it is rather than as the claim it explicitly denies.
  const allProse = stripDisclaimers(`${prose} ${brief.abstention_reason ?? ""}`);

  const violated = PROHIBITED_PATTERNS.filter(({ pattern }) => pattern.test(allProse));
  for (const { code } of violated) {
    failed.push(`prohibited_claim:${code}`);
  }
  check("no_prohibited_claims", violated.length === 0);

  // ---- Shape rules, which differ by grounding status ----------------------------------
  const scriptWords = countWords(brief.meeting_script.text);
  check(
    "script_word_count_65_to_80",
    scriptWords >= SCRIPT_MIN_WORDS && scriptWords <= SCRIPT_MAX_WORDS,
  );
  if (scriptWords < SCRIPT_MIN_WORDS || scriptWords > SCRIPT_MAX_WORDS) {
    failed.push(`script_word_count:${scriptWords}`);
  }

  check("script_cites_at_most_two_facts", brief.meeting_script.fact_ids.length <= SCRIPT_MAX_FACTS);

  if (brief.grounding_status === "grounded") {
    check(
      "snapshot_has_2_to_4_facts",
      brief.product_snapshot.length >= SNAPSHOT_MIN_FACTS &&
        brief.product_snapshot.length <= SNAPSHOT_MAX_FACTS,
    );
    check("grounded_objection_cites_a_fact", brief.objection_response.fact_ids.length > 0);

    // A fact good enough to say out loud belongs in the snapshot the rep can point at.
    const snapshotIds = new Set(brief.product_snapshot.map((item) => canon(item.fact_id)));
    check(
      "script_facts_appear_in_snapshot",
      brief.meeting_script.fact_ids.every((id) => snapshotIds.has(canon(id))),
    );
  } else {
    // Abstaining means abstaining: no product facts anywhere, and a stated reason.
    check("abstention_cites_no_facts", citedFactIds.length === 0);
    check("abstention_snapshot_is_empty", brief.product_snapshot.length === 0);
    check(
      "abstention_states_a_reason",
      Boolean(brief.abstention_reason && brief.abstention_reason.trim().length > 0),
    );
  }

  return {
    ok: failed.length === 0,
    // Deduplicated: the same check can legitimately run more than once (a fact cited in
    // two passages), and the trace should report each distinct check once.
    passed: [...new Set(passed)],
    failed: [...new Set(failed)],
    citedFactIds,
  };
}
