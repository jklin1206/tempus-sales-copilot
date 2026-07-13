/**
 * Evaluation harness (SPEC.md 12).
 *
 *   npm run eval                      live generation when a provider key is set; otherwise the
 *                                     app is in demo mode and this evaluates the bundled briefs.
 *   npm run eval -- --live            fail rather than evaluate bundled briefs.
 *   npm run eval -- --live --product  allow the one repair pass a rep actually gets.
 *
 * Every mode runs the same assertions against the same validator, so a scenario that passes
 * here passes for the same reason it would pass in the product.
 */

import "dotenv/config";

import { GOLDEN_SCENARIOS, type GoldenScenario } from "./golden";
import { getBrief } from "../src/lib/brief/generate";
import { selectProvider } from "../src/lib/generation/providers";
import { runMode } from "../src/lib/mode";
import { stripDisclaimers, validateBrief } from "../src/lib/validation/validate";
import { loadVaultFacts } from "../src/lib/data/vault";
import { loadCrmNote } from "../src/lib/data/crm";
import { findFixtureBrief, fixtureCoverage } from "../src/lib/fixtures";
import { findProvider, loadProviders, providersByOpportunity } from "../src/lib/providers";
import type { Brief } from "../src/lib/brief/schema";

const LIVE_ONLY = process.argv.includes("--live");

/**
 * `--product` measures what a rep experiences: a rejected draft gets one repair call, shown the
 * checks it failed. The default measures the single-shot brief, which is the honest number for
 * judging the prompt, because a prompt that needs the repair pass is a weaker prompt than one
 * that lands first time. Both are reported in prompts/CHANGELOG.md; quoting only the repaired
 * number would flatter the prompt.
 */
const PRODUCT_MODE = process.argv.includes("--product");

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

interface ScenarioResult {
  scenario: GoldenScenario;
  checks: Check[];
  passed: boolean;
  source: "live" | "fixture" | "missing";
}

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

/** Deterministic checks. These need no model and must pass in every mode. */
function deterministicChecks(): Check[] {
  const checks: Check[] = [];

  const ranked = providersByOpportunity();
  checks.push({
    name: "opportunity ranking is population desc, then physician_id",
    ok: ranked.map((p) => p.physicianId).join(",") === "p01,p02,p11,p03,p07,p08,p04,p09",
    detail: ranked.map((p) => p.physicianId).join(", "),
  });

  const monotone = ranked.every(
    (p, i) => i === 0 || ranked[i - 1]!.likelyPatientPopulation >= p.likelyPatientPopulation,
  );
  checks.push({ name: "opportunity ranking is monotone in population", ok: monotone });

  const joined = loadProviders().every((p) => p.crm.physicianId === p.physicianId);
  checks.push({ name: "all eight provider/CRM joins reconcile", ok: joined });

  // Every provider the UI can open must have a bundled brief, or the no-key demo has holes.
  const ids = loadProviders().map((p) => p.physicianId);
  const { missing } = fixtureCoverage(ids);
  checks.push({
    name: "every provider has a bundled fixture brief",
    ok: missing.length === 0,
    detail: missing.length > 0 ? `missing: ${missing.join(", ")}` : `${ids.length}/${ids.length}`,
  });

  const facts = loadVaultFacts();
  checks.push({
    name: "vault holds 25 to 35 sourced facts",
    ok: facts.length >= 25 && facts.length <= 35,
    detail: `${facts.length} facts`,
  });

  const fullySourced = facts.every((f) => f.sourceUrl && f.sourceSection && f.retrieved);
  checks.push({ name: "every fact carries a source URL, section, and retrieval date", ok: fullySourced });

  // The abstention has to be real: nothing in the vault may answer a pricing question.
  const pricing = /out-of-pocket|reimbursement|copay|price|pricing|payer coverage/i;
  checks.push({
    name: "no pricing or coverage fact exists, so the abstention is genuine",
    ok: !facts.some((f) => pricing.test(f.fact)),
  });

  checks.push({ name: "unknown physician ID is rejected", ok: findProvider("p99") === null });

  return checks;
}

/** Asserts one generated brief against its scenario. */
function checkScenario(scenario: GoldenScenario, brief: Brief): Check[] {
  const checks: Check[] = [];
  const facts = loadVaultFacts();
  const crm = loadCrmNote(scenario.physicianId);

  // A blocked brief carries no prose by design, so re-running the validator over it would
  // report a cascade of empty-string failures and bury the check that actually fired.
  if (brief.grounding_status === "validation_failed") {
    return [
      {
        name: "passes blocking validation",
        ok: false,
        detail: brief.failure_codes?.join(", ") ?? "blocked, no codes recorded",
      },
    ];
  }

  // 1. The brief must survive the same validator the product runs.
  const status: "grounded" | "abstain" = brief.grounding_status;
  const validation = validateBrief(
    { ...brief, grounding_status: status },
    { provider: { physicianId: scenario.physicianId }, crm, facts },
  );
  checks.push({ name: "passes blocking validation", ok: validation.ok, detail: validation.failed.join(", ") });

  // 2. Grounding status must match the label.
  checks.push({
    name: `grounding_status is ${scenario.expectedStatus}`,
    ok: brief.grounding_status === scenario.expectedStatus,
    detail: brief.grounding_status,
  });

  // 3. The brief must say why Tempus is relevant to this physician.
  checks.push({ name: "why_tempus is present", ok: brief.why_tempus.trim().length > 0 });

  const cited = validation.citedFactIds;

  // 4. The brief must actually answer the concern with a relevant fact.
  if (scenario.requiredAnyOf) {
    const hit = scenario.requiredAnyOf.filter((id) => cited.includes(id));
    checks.push({
      name: `cites a fact that answers "${scenario.concern}"`,
      ok: hit.length > 0,
      detail: cited.length > 0 ? `cited ${cited.join(", ")}` : "cited nothing",
    });
  }

  // 5. The products must stay on the concern.
  if (scenario.expectedProducts && brief.grounding_status === "grounded") {
    checks.push({
      name: `products stay within ${scenario.expectedProducts.join("/")}`,
      ok: brief.product_ids.length > 0 && brief.product_ids.every((id) => scenario.expectedProducts!.includes(id)),
      detail: brief.product_ids.join(", ") || "none",
    });
  }

  // 6. Forbidden language must be absent.
  //
  // Disclaimers are stripped with the SAME function the validator uses, not a second copy of
  // the idea. "This is a typical expectation, not a guaranteed turnaround" is the model doing
  // exactly the right thing, and an earlier version of this eval failed it for saying the word
  // it was disclaiming. That bug appeared once in the pricing rule, once here, once in the
  // turnaround rule, and then here again: it is worth exactly one implementation.
  const rawProse = [
    brief.why_tempus,
    brief.objection_response.text,
    brief.meeting_script.text,
    ...brief.product_snapshot.map((s) => s.display_text),
  ].join(" ");
  const prose = stripDisclaimers(rawProse);

  for (const pattern of scenario.forbidden ?? []) {
    checks.push({
      name: `does not say ${pattern}`,
      ok: !pattern.test(prose),
      detail: pattern.test(prose) ? (prose.match(pattern)?.[0] ?? "") : undefined,
    });
  }

  // 7. No manufactured urgency. There is no catalyst feed, so nothing may imply one.
  const urgency =
    /\b(now is the time|act (now|fast)|this quarter|recently (approved|launched|changed)|time[- ]sensitive opportunity)\b/i;
  checks.push({
    name: "does not manufacture urgency",
    ok: !urgency.test(prose),
    detail: prose.match(urgency)?.[0],
  });

  // 8. Abstention must be a real abstention, not a hedge with facts attached.
  if (scenario.expectedStatus === "abstain") {
    checks.push({ name: "abstention cites no product facts", ok: cited.length === 0, detail: cited.join(", ") });
  }

  return checks;
}

async function runScenario(scenario: GoldenScenario): Promise<ScenarioResult> {
  let brief: Brief | null = null;
  let source: ScenarioResult["source"] = "missing";

  if (runMode() === "live") {
    try {
      brief = await getBrief(scenario.physicianId, { mode: "live", repair: PRODUCT_MODE });
      source = "live";
    } catch (error) {
      // One scenario erroring must not abort the suite: the others still carry information,
      // and an aborted run reports nothing at all.
      return {
        scenario,
        source: "live",
        passed: false,
        checks: [{ name: "generation completed", ok: false, detail: (error as Error).message }],
      };
    }
  } else {
    brief = findFixtureBrief(scenario.physicianId);
    source = brief ? "fixture" : "missing";
  }

  if (!brief) {
    return {
      scenario,
      source: "missing",
      passed: false,
      checks: [
        {
          name: "a brief is available to evaluate",
          ok: false,
          detail: "No provider key and no committed fixture. Run `npm run fixtures` with a key set.",
        },
      ],
    };
  }

  const checks = checkScenario(scenario, brief);
  return { scenario, checks, passed: checks.every((c) => c.ok), source };
}

async function main() {
  console.log(bold("\nTempus Sales Copilot — evaluation\n"));

  if (LIVE_ONLY && runMode() === "demo") {
    console.error(red("--live was requested but the selected AI_PROVIDER has no key configured.\n"));
    process.exit(1);
  }

  const mode =
    runMode() === "live"
      ? `live via ${selectProvider().id} (${selectProvider().modelName()}), ${
          PRODUCT_MODE ? "with the product's one repair pass" : "single-shot, no repair"
        }`
      : "demo mode: bundled briefs (no provider key configured)";
  console.log(dim(`Mode: ${mode}\n`));

  console.log(bold("Deterministic checks"));
  const deterministic = deterministicChecks();
  for (const check of deterministic) {
    console.log(
      `  ${check.ok ? green("PASS") : red("FAIL")}  ${check.name}${check.detail ? dim(`  (${check.detail})`) : ""}`,
    );
  }

  console.log(bold("\nGolden scenarios"));

  const results: ScenarioResult[] = [];
  for (const scenario of GOLDEN_SCENARIOS) {
    // Sequential, not parallel: a free-tier key has a rate limit, and a 429 storm would look
    // like a grounding failure.
    const result = await runScenario(scenario);
    results.push(result);

    const status = result.passed ? green("PASS") : red("FAIL");
    console.log(
      `\n  ${status}  ${result.scenario.id}. ${result.scenario.physicianId} — ${result.scenario.concern} ${dim(`[${result.source}]`)}`,
    );

    for (const check of result.checks) {
      if (check.ok) {
        console.log(`        ${green("✓")} ${dim(check.name)}`);
      } else {
        console.log(`        ${red("✗")} ${check.name}${check.detail ? red(`  → ${check.detail}`) : ""}`);
      }
    }
  }

  const deterministicPassed = deterministic.filter((c) => c.ok).length;
  const scenariosPassed = results.filter((r) => r.passed).length;

  console.log(bold("\n\nSummary"));
  console.log(`  Deterministic: ${deterministicPassed}/${deterministic.length}`);
  console.log(`  Golden scenarios: ${scenariosPassed}/${results.length}`);

  const allPassed = deterministicPassed === deterministic.length && scenariosPassed === results.length;

  if (allPassed) {
    console.log(green(bold("\n  All checks passed.\n")));
  } else {
    console.log(red(bold("\n  Failures above.\n")));
  }

  console.log(
    dim(
      "  These are author-labeled regression checks over eight fictional scenarios.\n" +
        "  They are not a claim of real-world accuracy.\n",
    ),
  );

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error(red(`\nEval harness failed: ${error.message}\n`));
  process.exit(1);
});
