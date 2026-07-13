import { NextResponse } from "next/server";

import { briefRequestSchema, toClientBrief, type SourceLookup } from "@/lib/brief/schema";
import { getBrief, UnknownPhysicianError } from "@/lib/brief/generate";
import { ModelUnavailableError } from "@/lib/generation/providers";
import { loadVaultIndex } from "@/lib/data/vault";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/brief (SPEC.md 9.3)
 *
 * Server-only. The model key is read here and never crosses to the browser.
 *
 * The response is a ClientBrief: the finished, validated prose plus a provenance label.
 * Fact IDs, source URLs, the vault, and the validation trace all stay on this side of the
 * wire. Grounding is enforced here, not audited in the browser.
 */
export const runtime = "nodejs";

/**
 * The worst case here is longer than one model call. A draft is retried up to MAX_ATTEMPTS on a
 * transient fault, and a draft the validator rejects gets a repair call that is retried on the
 * same terms -- so a pathological request is six calls plus their backoffs, not one. The default
 * timeout would cut that off mid-repair and surface a 504 in place of the 503 this route is
 * careful to return. Sixty seconds clears the bad path and is the Hobby-plan ceiling, so it holds
 * whichever plan this lands on.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = briefRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: "Request must supply a physicianId." },
      { status: 400 },
    );
  }

  // A generation cap keeps a public demo key from being drained by a hot reload loop or a
  // curious visitor (SPEC.md 13).
  const limit = checkRateLimit(request);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `This demo allows ${limit.limit} generations per minute. Try again in a moment.`,
      },
      { status: 429 },
    );
  }

  try {
    const brief = await getBrief(parsed.data.physicianId);

    // The vault stays here. Only the source of a fact this brief actually cited crosses the
    // wire, so a rep can click through when a physician pushes back.
    const vault = loadVaultIndex();
    const sourceOf: SourceLookup = (factId) => {
      const fact = vault.get(factId);
      return fact ? { sourceUrl: fact.sourceUrl, sourceSection: fact.sourceSection } : null;
    };

    return NextResponse.json(toClientBrief(brief, sourceOf));
  } catch (error) {
    if (error instanceof UnknownPhysicianError) {
      // Unknown IDs are rejected, not guessed at (SPEC.md 11.4).
      return NextResponse.json(
        { error: "unknown_physician", message: "That physician is not in this territory." },
        { status: 404 },
      );
    }

    if (error instanceof ModelUnavailableError) {
      // The panel already titles this "Brief unavailable", so the body carries the reason.
      return NextResponse.json({ error: "model_unavailable", message: error.message }, { status: 503 });
    }

    // Log server-side; return nothing that could echo the CRM note or the prompt back.
    console.error("[api/brief] unexpected failure", error);
    return NextResponse.json(
      { error: "generation_failed", message: "The brief could not be generated." },
      { status: 500 },
    );
  }
}
