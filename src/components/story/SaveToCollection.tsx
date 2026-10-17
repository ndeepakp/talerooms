"use client";

import { useEffect, useRef, useState } from "react";

type Collection = { id: string; name: string; count: number; contains: boolean };

// "Save to collection" control on a story page. Opens a menu of the reader's
// collections (toggle the story in/out) plus a field to create a new one.
export function SaveToCollection({ storyId }: { storyId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (open && e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function load() {
    const res = await fetch(`/api/collections?storyId=${storyId}`, { cache: "no-store" });
    if (res.ok) setItems((await res.json()).items as Collection[]);
    setLoaded(true);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) load();
  }

  async function toggle(c: Collection) {
    const method = c.contains ? "DELETE" : "POST";
    const res = await fetch(`/api/collections/${c.id}/stories`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? { ...x, contains: !c.contains, count: x.count + (c.contains ? -1 : 1) }
            : x,
        ),
      );
    }
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, storyId }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => [
        { id: data.id, name: data.name, count: 1, contains: true },
        ...prev,
      ]);
      setNewName("");
    }
  }

  const savedCount = items.filter((c) => c.contains).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="story-toolbar-button"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill={loaded && savedCount > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4Z" /></svg>
        {loaded && savedCount > 0 ? `Saved (${savedCount})` : "Save to collection"}
      </button>

      {open && (
        <div role="region" aria-label="Collection picker" className="fixed inset-x-4 bottom-4 z-50 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-ui bg-surface-raised shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:w-72">
          <div className="border-b border-ui px-4 py-2.5 text-sm font-semibold text-ink">
            Save to collection
          </div>

          {!loaded ? (
            <p className="px-4 py-4 text-center text-sm text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-4 text-center text-sm text-muted">
              No collections yet — create one below.
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-surface-soft"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {c.name}{" "}
                      <span className="text-xs text-subtle">({c.count})</span>
                    </span>
                    <span className={c.contains ? "text-accent" : "text-ui-strong"}>
                      {c.contains ? "✓" : "＋"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 border-t border-ui p-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
              placeholder="New collection…"
              maxLength={80}
              className="h-11 min-w-0 flex-1 rounded-lg border border-ui-strong bg-surface-raised px-2 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={createAndAdd}
              disabled={busy || !newName.trim()}
              className="h-11 shrink-0 rounded-lg btn-primary px-3 text-sm font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
