import Link from "next/link";

import { providersByOpportunity } from "@/lib/providers";

/**
 * The workspace: the complete territory, ranked, and a way in.
 *
 * One ranking, one workflow. Pick a provider, get a brief. The product used to open on a "Today"
 * queue of five, which implied a daily task list it had no data to support: no contacted state, no
 * completed state, no catalyst feed. That framing is gone rather than faked.
 */
export default function WorkspacePage() {
  const providers = providersByOpportunity();

  return (
    <div>
      {/* No explainer paragraph. What "estimated opportunity" is and is not, why there is one
          ranking and no daily queue, why the vault cannot answer a pricing question: all of that
          is the walkthrough's job. The screen a rep uses should show them the territory, not
          argue with them about it. The column label carries the one caveat that matters. */}
      <header>
        <p className="eyebrow">Territory</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
          {providers.length} oncologists, ranked by opportunity
        </h1>
      </header>

      <ul className="surface mt-7 divide-y divide-stone-200">
        {providers.map((provider) => (
          <li key={provider.physicianId} className="row">
            <Link
              href={`/providers/${provider.physicianId}`}
              className="group flex items-center gap-5 px-6 py-5"
            >
              <span
                aria-hidden
                className="metric-value w-6 shrink-0 text-sm text-stone-400 group-hover:text-accent"
              >
                {String(provider.opportunityRank).padStart(2, "0")}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-stone-900 group-hover:text-accent-deep">
                  {provider.oncologistName}
                </span>
                <span className="block truncate text-sm text-stone-500">{provider.providerOrg}</span>
              </span>

              <span className="shrink-0 text-right">
                <span className="metric-value block text-lg">
                  {provider.likelyPatientPopulation.toLocaleString()}
                </span>
                {/* "proxy" is the one word that has to survive the edit. Without it the number
                    reads as a forecast, which it is not. */}
                <span
                  className="metric-label block"
                  title="Mock annual patient-population estimate. A directional proxy only: not conversion probability, revenue, product fit, or clinical suitability."
                >
                  opportunity proxy
                </span>
              </span>

              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="size-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
              >
                <path
                  d="m6 3 5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
