"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface ComboboxOption {
  physicianId: string;
  oncologistName: string;
  providerOrg: string;
}

/**
 * Known-physician selector (SPEC.md 4.2).
 *
 * Matches physician name and provider organization across a fixed list. There is no free-text
 * query: selecting a physician is the action, and it routes to the provider-detail page, which is
 * also where a row in the territory list leads.
 */
export function ProviderCombobox({ options }: { options: ComboboxOption[] }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return options;
    return options.filter(
      (option) =>
        option.oncologistName.toLowerCase().includes(needle) ||
        option.providerOrg.toLowerCase().includes(needle),
    );
  }, [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Close on an outside click so the listbox never sits over the page content.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const select = (option: ComboboxOption | undefined) => {
    if (!option) return;
    setOpen(false);
    setQuery("");
    router.push(`/providers/${option.physicianId}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open) select(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search physicians by name or organization
      </label>

      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
        >
          <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[activeIndex] ? `${listId}-${matches[activeIndex].physicianId}` : undefined}
          placeholder="Search physician or organization"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 hover:border-stone-400"
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Known physicians"
          className="absolute right-0 z-50 mt-2 max-h-80 w-full min-w-72 overflow-auto rounded-2xl border border-stone-200 bg-white py-1.5 shadow-xl shadow-stone-900/10"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-stone-500">
              No physician matches that name or organization.
            </li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option.physicianId}
                id={`${listId}-${option.physicianId}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  // Fire before the input's blur closes the list.
                  event.preventDefault();
                  select(option);
                }}
                className={`mx-1.5 cursor-pointer rounded-lg px-2.5 py-2 ${index === activeIndex ? "bg-stone-100" : ""}`}
              >
                <p className="text-sm font-medium text-stone-900">{option.oncologistName}</p>
                <p className="text-xs text-stone-500">{option.providerOrg}</p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
