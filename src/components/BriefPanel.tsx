"use client";

import { useEffect, useRef, useState } from "react";

import type { ClientBrief, ClientFact } from "@/lib/brief/schema";

/**
 * The meeting brief.
 *
 * Selecting a physician is the action, so this generates on mount. There is no second "Generate"
 * button, and no cache: what you are reading was written for you, just now.
 *
 * It is ONE document on one surface. It used to be five separate cards, each with its own border
 * and shadow, which made a rep navigate something they only need to read top to bottom. Sections
 * are separated by an eyebrow label and a hairline, which is enough.
 *
 * Fact IDs and the validation trace stay on the server: grounding is a guarantee the system makes,
 * not homework it hands to the rep. The source link behind each claim does cross the wire, because
 * when a physician pushes back the rep needs somewhere to point.
 */

type PanelState =
  | { kind: "loading" }
  | { kind: "ready"; brief: ClientBrief }
  | { kind: "error"; message: string };

interface BriefResponse {
  ok: boolean;
  status: number;
  payload: { message?: string } & Partial<ClientBrief>;
}

interface ProviderProps {
  physicianId: string;
  oncologistName: string;
  providerOrg: string;
  likelyPatientPopulation: number;
  crmBody: string;
  lastContact: string;
}

export function BriefPanel(props: ProviderProps) {
  const { physicianId } = props;
  const [state, setState] = useState<PanelState>({ kind: "loading" });

  // The in-flight request, not a "have I started" boolean.
  //
  // React re-runs effects on mount in dev StrictMode. A boolean guard plus a cleanup that cancels
  // the request is the obvious approach and it deadlocks: the first run's cleanup discards the
  // response, and the second run sees the guard and never asks again, so the panel spins forever.
  // Caching the promise means the second run reuses the same request and consumes its result.
  const inflight = useRef<Promise<BriefResponse> | null>(null);

  useEffect(() => {
    let active = true;

    inflight.current ??= (async (): Promise<BriefResponse> => {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ physicianId }),
      });
      return { ok: response.ok, status: response.status, payload: await response.json() };
    })();

    void inflight.current
      .then(({ ok, payload }) => {
        if (!active) return;
        if (!ok) {
          setState({ kind: "error", message: payload?.message ?? "The brief could not be prepared." });
          return;
        }
        setState({ kind: "ready", brief: payload as ClientBrief });
      })
      .catch(() => {
        if (active) setState({ kind: "error", message: "Could not reach the brief service." });
      });

    return () => {
      active = false;
    };
  }, [physicianId]);

  return (
    <section className="surface p-7 md:p-9">
      <BriefHeader {...props} state={state} />

      {state.kind === "loading" && <BriefSkeleton />}
      {state.kind === "error" && <BriefError message={state.message} />}
      {state.kind === "ready" && <BriefBody brief={state.brief} crmBody={props.crmBody} />}
    </section>
  );
}

/** Provider identity, status, and the opportunity metric. Always shown, even while generating. */
function BriefHeader({
  oncologistName,
  providerOrg,
  likelyPatientPopulation,
  lastContact,
  state,
}: ProviderProps & { state: PanelState }) {
  const brief = state.kind === "ready" ? state.brief : null;
  const abstained = brief?.grounding_status === "abstain";
  const blocked = brief?.grounding_status === "validation_failed";
  const isFixture = brief?.generation_mode === "demo_fixture";

  return (
    <header className="border-b border-stone-200 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Meeting prep</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{oncologistName}</h1>
          <p className="mt-1 text-sm text-stone-500">{providerOrg}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {brief && !blocked && (
            <span className={abstained ? "status status-warn" : "status status-good"}>
              {abstained ? "Abstained" : "Grounded"}
            </span>
          )}
          {/* A live brief carries no provenance chip: it was written for this rep, just now, which
              is what they assumed anyway. The bundled case IS labeled, because that is the one
              state where saying nothing would be a lie. The banner above says the app is in demo
              mode; this says it about the words on this page. */}
          {isFixture && (
            <span
              className="status status-muted"
              title="A bundled recording of real model output that passed this same validator. Shown because the app is in demo mode: no model API key is configured."
            >
              Prerecorded
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4 border-t border-stone-200 pt-5">
        <div>
          <p className="metric-label">Estimated opportunity · directional proxy</p>
          <p className="metric-value mt-0.5 text-xl">{likelyPatientPopulation.toLocaleString()}</p>
        </div>
        <div>
          <p className="metric-label">Last contact</p>
          <p className="metric-value mt-0.5 text-xl">{lastContact}</p>
        </div>
      </div>
    </header>
  );
}

/**
 * One honest loading state.
 *
 * This used to be a four-step checklist ("Loaded CRM note", "Validating claims") advancing on a
 * 1.8-second timer. It was theatre: the timer knew nothing about the server, and when generation
 * returned in three seconds the steps flashed past unreadably. Real per-stage progress would mean
 * streaming events, which is not worth it for a few seconds of work.
 */
function BriefSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="mt-8 space-y-8">
      <div className="flex items-center gap-2.5">
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4 animate-spin text-accent">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-medium text-stone-900">Preparing brief</p>
        <span className="text-xs text-stone-400">grounding every claim before it reaches you</span>
      </div>

      {[
        ["w-24", ["w-full", "w-4/5"]],
        ["w-32", ["w-full", "w-11/12", "w-2/3"]],
        ["w-28", ["w-full", "w-full", "w-3/4"]],
      ].map(([label, lines], i) => (
        <div key={i}>
          <div className={`skeleton h-2.5 ${label}`} />
          <div className="mt-3 space-y-2.5">
            {(lines as string[]).map((w, j) => (
              <div key={j} className={`skeleton h-3 ${w}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BriefError({ message }: { message: string }) {
  return (
    <div className="mt-8" role="alert">
      <p className="eyebrow text-accent-deep">Brief unavailable</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900">
        Nothing is shown in place of a grounded brief.
      </h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-stone-600">{message}</p>
      <p className="mt-4 text-xs leading-5 text-stone-500">
        A partially grounded pitch is worse than none, so this fails closed rather than showing you prose it
        could not stand behind.
      </p>
    </div>
  );
}

function BriefBody({ brief, crmBody }: { brief: ClientBrief; crmBody: string }) {
  const abstained = brief.grounding_status === "abstain";

  if (brief.grounding_status === "validation_failed") {
    return (
      <div className="mt-8" role="alert">
        <p className="eyebrow text-accent-deep">Blocked</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900">
          This draft failed a grounding check, and so did its correction.
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-stone-600">
          The model was shown exactly which checks it failed and asked to fix them. The corrected brief did
          not pass either, so none of it is shown. That is the safe result, not a bug. Reload to try again.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <section>
        <p className="eyebrow">Why Tempus</p>
        <p className="generated-copy mt-3 text-base font-medium text-stone-900">{brief.why_tempus}</p>
      </section>

      <section>
        <p className="eyebrow">From your CRM</p>
        <CrmNote body={crmBody} excerpt={brief.supporting_crm_excerpt} />
      </section>

      {brief.product_evidence.length > 0 && (
        <section>
          <p className="eyebrow">Talking points</p>
          <div className="mt-3 divide-y divide-stone-200 border-y border-stone-200">
            {brief.product_evidence.map((fact) => (
              <TalkingPoint key={fact.text} fact={fact} />
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="eyebrow">{abstained ? "Objection handler · abstained" : "Objection handler"}</p>
        <p className={`generated-copy mt-3 ${abstained ? "text-stone-800" : ""}`}>{brief.objection_response}</p>

        {abstained && brief.abstention_reason && (
          <p className="mt-4 rounded-2xl bg-[#fff4df] px-4 py-3 text-xs leading-5 text-[#8a5a1f]">
            <span className="font-semibold">Why there is no answer here: </span>
            {brief.abstention_reason}
          </p>
        )}
      </section>

      {/* The one thing the rep says out loud, inverted so it is impossible to lose on the page. */}
      <section className="rounded-2xl bg-stone-900 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-stone-400">30-second meeting script</p>
          {/* stone-500 on stone-900 fails contrast; this sits on a dark ground and has to hold up. */}
          <span className="metric-value shrink-0 text-xs text-stone-400">
            {countWords(brief.meeting_script)} words
          </span>
        </div>
        <p className="generated-copy generated-copy-dark mt-3">{brief.meeting_script}</p>
      </section>
    </div>
  );
}

function TalkingPoint({ fact }: { fact: ClientFact }) {
  return (
    <div className="py-4">
      <div className="flex items-start gap-3">
        <svg aria-hidden viewBox="0 0 18 18" fill="none" className="mt-1 size-[17px] shrink-0 text-accent">
          <circle cx="9" cy="9" r="7.75" stroke="currentColor" strokeWidth="1.3" opacity="0.45" />
          <path
            d="m5.75 9.25 2.1 2.1 4.4-4.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="generated-copy text-sm text-stone-800">{fact.text}</p>
      </div>

      {fact.source_url && (
        <a
          href={fact.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-8 mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent-deep underline-offset-4 transition-colors hover:text-[#7f3326] hover:underline"
        >
          {fact.source_section || "Source"}
          <svg aria-hidden viewBox="0 0 13 13" fill="none" className="size-3">
            <path
              d="M5 2.5h5.5V8M10.5 2.5 3.5 9.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      )}
    </div>
  );
}

/**
 * The CRM note, with the sentence the brief quoted marked inside it.
 *
 * This replaces two cards that showed the same text: a sidebar with the whole note, and a "what
 * they told you" card repeating one sentence of it. The rep reads the note once and can see, in
 * place, which line the brief is standing on.
 */
function CrmNote({ body, excerpt }: { body: string; excerpt: string }) {
  const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

  // The excerpt is validated server-side as an exact substring of this note, but it may differ in
  // whitespace or typographic glyphs, so it is located tolerantly rather than by strict indexOf.
  const index = excerpt ? normalize(body).indexOf(normalize(excerpt)) : -1;

  let content: React.ReactNode = body;

  if (index !== -1) {
    // Map the normalized offset back onto the original string so the highlight lands on the real
    // characters, punctuation and all.
    const target = normalize(excerpt).length;
    let seen = 0;
    let start = -1;
    let end = -1;

    for (let i = 0; i < body.length; i++) {
      const isSpace = /\s/.test(body[i]!);
      const prevIsSpace = i > 0 && /\s/.test(body[i - 1]!);
      if (isSpace && prevIsSpace) continue; // collapsed run, matches normalize()

      if (seen === index && start === -1) start = i;
      if (seen === index + target) {
        end = i;
        break;
      }
      seen++;
    }

    if (start !== -1) {
      if (end === -1) end = body.length;
      content = (
        <>
          {body.slice(0, start)}
          <mark className="rounded bg-accent-soft px-0.5 text-stone-900">{body.slice(start, end)}</mark>
          {body.slice(end)}
        </>
      );
    }
  }

  return (
    <blockquote className="mt-3 whitespace-pre-line border-l-2 border-accent pl-4 text-sm leading-7 text-stone-600">
      {content}
    </blockquote>
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
