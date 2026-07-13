import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import "./globals.css";
import { ProviderCombobox } from "@/components/ProviderCombobox";
import { loadProviders } from "@/lib/providers";
import { runMode } from "@/lib/mode";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Tempus Sales Copilot",
  description:
    "Grounded meeting preparation for a fictional oncology territory. Prototype using PHI-free data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The combobox lists only known physicians, so it is built from the market data on the server
  // and never accepts a free-text query. It carries name and organization only: no CRM text and
  // no product knowledge reaches the browser through it.
  const options = loadProviders().map((p) => ({
    physicianId: p.physicianId,
    oncologistName: p.oncologistName,
    providerOrg: p.providerOrg,
  }));

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-paper/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3.5">
            {/* The real Tempus T mark, not an invented one.
                Caveat worth knowing: this is the 200px avatar badge from Built In's CDN, not the
                official wordmark, because tempus.com blocks automated fetches. It is fine at 24px
                and should be swapped for the official asset before this is shown to Tempus. */}
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/tempus-mark.png" alt="Tempus" width={24} height={24} priority className="rounded-full" />
              <span className="text-[15px] font-medium tracking-tight text-stone-600">Sales Copilot</span>
            </Link>

            <div className="ml-auto w-full sm:w-80">
              <ProviderCombobox options={options} />
            </div>
          </div>

          {/* Demo mode is a state of the whole app, so it is stated once, at the top, rather than
              left to a chip on the panel to imply. A reviewer running this without a key should
              never have to wonder whether what they are reading was written for them. */}
          {runMode() === "demo" && (
            <div className="border-t border-amber-200/70 bg-[#fff8ec]">
              <p className="mx-auto max-w-4xl px-6 py-2 text-xs leading-5 text-[#8a5a1f]">
                <span className="font-semibold">Demo mode.</span> No model API key is configured, so every
                brief below is a bundled recording of real, previously validated model output. Nothing here
                is being generated now. Set a key to run live.
              </p>
            </div>
          )}
        </header>

        <main id="main" className="mx-auto max-w-4xl px-6 py-10">
          {children}
        </main>

        {/* One line, not a paragraph. The reasoning behind every design decision belongs in the
            walkthrough, not stapled to the bottom of every screen. What has to stay is the part a
            viewer cannot infer and would be misled without: this is fake data, and it is not
            medical advice. */}
        <footer className="mx-auto max-w-4xl px-6 pb-12">
          <p className="border-t border-stone-200 pt-5 text-xs text-stone-400">
            Prototype · fictional PHI-free data · sales aid, not medical advice
          </p>
        </footer>
      </body>
    </html>
  );
}
