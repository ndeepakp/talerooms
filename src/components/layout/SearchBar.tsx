"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestions = {
  genres: { id: number; name: string }[];
  users: { id: string; name: string | null; username: string | null }[];
  stories: { id: string; title: string; author: string | null }[];
};

const EMPTY: Suggestions = { genres: [], users: [], stories: [] };

export function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<Suggestions>(EMPTY);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside the search box.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounce: wait until the reader pauses typing before asking the server.
  // The empty-query reset lives in the input's onChange (an event handler), not
  // here, so the effect never calls setState synchronously.
  useEffect(() => {
    const term = q.trim();
    if (term.length === 0) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as Suggestions;
      if (!cancelled) {
        setResults(data);
        setOpen(true);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) go(`/search?q=${encodeURIComponent(term)}`);
  }

  const hasResults =
    results.genres.length + results.users.length + results.stories.length > 0;

  return (
    <div className="relative" ref={ref}>
      <form onSubmit={submit}>
        <input
          type="search"
          aria-label="Search stories, genres, or authors"
          value={q}
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            // Clear stale suggestions immediately when the box is emptied.
            if (value.trim().length === 0) {
              setResults(EMPTY);
              setOpen(false);
            }
          }}
          onFocus={() => q.trim() && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search stories or $handles…"
          className="h-11 w-full rounded-full border border-ui bg-surface-soft px-4 text-sm text-ink placeholder:text-muted focus:border-ui-strong"
        />
      </form>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-96 overflow-auto rounded-xl border border-ui bg-surface-raised py-1 shadow-lg">
          {!hasResults ? (
            <p className="px-4 py-3 text-sm text-muted">No matches.</p>
          ) : (
            <>
              {results.genres.length > 0 && (
                <Group label="Genres">
                  {results.genres.map((g) => (
                    <Row key={`g-${g.id}`} onClick={() => go(`/genres/${g.id}`)}>
                      <span className="text-ink">{g.name}</span>
                    </Row>
                  ))}
                </Group>
              )}
              {results.users.length > 0 && (
                <Group label="People">
                  {results.users.map((u) => (
                    <Row key={`u-${u.id}`} onClick={() => go(`/${u.username ?? u.id}`)}>
                      <span className="text-ink">
                        {u.name ?? "Unknown"}
                      </span>
                      {u.username && (
                        <span className="ml-2 text-muted">${u.username}</span>
                      )}
                    </Row>
                  ))}
                </Group>
              )}
              {results.stories.length > 0 && (
                <Group label="Stories">
                  {results.stories.map((s) => (
                    <Row key={`s-${s.id}`} onClick={() => go(`/stories/${s.id}`)}>
                      <span className="text-ink">{s.title}</span>
                      <span className="ml-2 text-muted">by {s.author ?? "Unknown"}</span>
                    </Row>
                  ))}
                </Group>
              )}
            </>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
            className="block w-full border-t border-ui px-4 py-2.5 text-left text-sm font-medium text-ink-soft hover:bg-surface-soft"
          >
            See all results for “{q.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-subtle">
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="block w-full truncate px-4 py-2 text-left text-sm hover:bg-surface-soft"
    >
      {children}
    </button>
  );
}
