/**
 * Dumps the RAW model output and the validator's verdict for one physician.
 *
 * The product deliberately throws away the prose of a blocked brief, which is correct for a
 * rep and useless for debugging. This bypasses that, so a failing eval can be diagnosed from
 * what the model actually wrote rather than guessed at.
 *
 *   npx tsx scripts/debug-brief.ts p02
 */
import "dotenv/config";

import { FullVaultKnowledgeProvider } from "../src/lib/knowledge/provider";
import { buildPrompt } from "../src/lib/generation/prompt";
import { generateBrief } from "../src/lib/generation/providers";
import { validateBrief } from "../src/lib/validation/validate";
import { findProvider } from "../src/lib/providers";

async function main() {
  const physicianId = process.argv[2] ?? "p02";

  const provider = findProvider(physicianId);
  if (!provider) throw new Error(`Unknown physician: ${physicianId}`);

  const knowledge = await new FullVaultKnowledgeProvider().getContext({ physicianId });
  const { brief, provider: providerId, model } = await generateBrief(buildPrompt(provider, knowledge));

  const validation = validateBrief(brief, { provider, crm: provider.crm, facts: knowledge.facts });

  console.log(`\n═══ ${physicianId} — ${provider.oncologistName} — ${providerId}/${model} ═══`);
  console.log(`status: ${brief.grounding_status}   validator: ${validation.ok ? "PASS" : "BLOCKED"}`);
  if (!validation.ok) console.log(`failed: ${validation.failed.join(", ")}`);

  console.log(`\nWHY TEMPUS [${brief.product_ids.join(", ") || "none"}]\n  ${brief.why_tempus}`);

  console.log(`\nEVIDENCE`);
  for (const item of brief.product_snapshot) console.log(`  [${item.fact_id}]\n    ${item.display_text}`);

  console.log(`\nOBJECTION [${brief.objection_response.fact_ids.join(", ") || "no facts"}]`);
  console.log(`  ${brief.objection_response.text}`);

  const words = brief.meeting_script.text.trim().split(/\s+/).filter(Boolean).length;
  console.log(`\nSCRIPT [${brief.meeting_script.fact_ids.join(", ") || "no facts"}] — ${words} words`);
  console.log(`  ${brief.meeting_script.text}`);

  if (brief.abstention_reason) console.log(`\nABSTENTION REASON\n  ${brief.abstention_reason}`);
  console.log();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
