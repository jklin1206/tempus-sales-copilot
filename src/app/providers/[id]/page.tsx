import { notFound } from "next/navigation";
import Link from "next/link";

import { BriefPanel } from "@/components/BriefPanel";
import { findProvider, loadProviders } from "@/lib/providers";
import { formatDate } from "@/lib/ranking/dates";

/** Pre-renders all eight known providers; anything else 404s (SPEC.md 11.4). */
export function generateStaticParams() {
  return loadProviders().map((provider) => ({ id: provider.physicianId }));
}

export default async function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = findProvider(id);

  // An unknown physician ID is rejected rather than handled, so no path is ever built from
  // unvalidated input.
  if (!provider) notFound();

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-3.5">
          <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Territory
      </Link>

      {/* The whole brief is one document on one surface, header included. It used to be five
          separate floating cards, which made a rep navigate something they only need to read. */}
      <div className="mt-4">
        <BriefPanel
          physicianId={provider.physicianId}
          oncologistName={provider.oncologistName}
          providerOrg={provider.providerOrg}
          likelyPatientPopulation={provider.likelyPatientPopulation}
          crmBody={provider.crm.body}
          lastContact={formatDate(provider.crm.lastContact)}
        />
      </div>
    </div>
  );
}
