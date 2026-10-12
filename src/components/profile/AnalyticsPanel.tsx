"use client";

import { useEffect, useState } from "react";
import { MiniBarChart, type ChartPoint } from "@/components/profile/MiniBarChart";
import { CURRENCY } from "@/lib/pricing";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

type Data = {
  views: ChartPoint[];
  purchases: ChartPoint[];
  earnings: ChartPoint[];
  subscribers: number;
};

const EMPTY: Data = { views: [], purchases: [], earnings: [], subscribers: 0 };

function total(pts: ChartPoint[]) {
  return pts.reduce((s, p) => s + p.value, 0);
}

// Author analytics with a clickable day-range selector. Refetches when the
// range changes.
export function AnalyticsPanel() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  // Bumped to force a refetch (e.g. when returning to the tab).
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // no-store so the browser never serves a stale cached copy after a
      // purchase / subscription happens elsewhere.
      const res = await fetch(`/api/me/analytics?days=${days}`, { cache: "no-store" });
      if (!active) return;
      if (res.ok) setData((await res.json()) as Data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [days, reload]);

  // Refresh whenever the user comes back to this tab/window.
  useEffect(() => {
    const onFocus = () => setReload((r) => r + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Which graph is opened in the expanded view (by title), if any.
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cards: { title: string; pts: ChartPoint[]; fmt?: (n: number) => string; total: string }[] = [
    { title: "Views", pts: data.views, total: String(total(data.views)) },
    { title: "Purchases", pts: data.purchases, total: String(total(data.purchases)) },
    {
      title: "Earnings",
      pts: data.earnings,
      fmt: (n) => `${CURRENCY}${n}`,
      total: `${CURRENCY}${total(data.earnings)}`,
    },
  ];

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Analytics
          </h2>
          <p className="mt-1 text-sm text-muted">
            Views, purchases and earnings across your stories ·{" "}
            <strong className="text-ink-soft">
              {data.subscribers}
            </strong>{" "}
            active {data.subscribers === 1 ? "subscriber" : "subscribers"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={
                "min-h-11 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors " +
                (days === r.days
                  ? "chip-active"
                  : "border-ui-strong text-ink-soft hover:bg-surface-soft")
              }
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReload((r) => r + 1)}
            aria-label="Refresh"
            title="Refresh"
            className="min-h-11 min-w-11 rounded-full border border-ui-strong px-3 py-1 text-sm text-ink-soft hover:bg-surface-soft"
          >
            ↻
          </button>
        </div>
      </div>

      <div className={"mt-4 grid gap-4 sm:grid-cols-3 " + (loading ? "opacity-60" : "")}>
        {cards.map((c) => (
          <button
            key={c.title}
            type="button"
            onClick={() => setExpanded(c.title)}
            title="Click to expand"
            className="rounded-2xl border border-ui bg-surface-raised p-4 text-left transition-colors hover:border-ui-strong"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted">
                {c.title}
              </span>
              <span className="text-lg font-semibold text-ink">
                {c.total}
              </span>
            </div>
            <div className="mt-3">
              {c.pts.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-subtle">
                  {loading ? "Loading…" : "No data"}
                </div>
              ) : (
                <MiniBarChart data={c.pts} format={c.fmt} />
              )}
            </div>
            <p className="mt-2 text-right text-[10px] text-subtle">Click to expand ⤢</p>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Earnings are mocked for now — they reflect the prices readers would have paid.
      </p>

      {/* Expanded graph overlay */}
      {expanded &&
        (() => {
          const c = cards.find((card) => card.title === expanded);
          if (!c) return null;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-8"
              onClick={() => setExpanded(null)}
            >
              <div
                className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-ui bg-surface-raised p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-ink">
                      {c.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted">
                      Last {days} days · total{" "}
                      <strong className="text-ink-soft">{c.total}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(null)}
                    aria-label="Close"
                    className="min-h-11 min-w-11 rounded-full border border-ui-strong px-3 py-1 text-sm text-ink-soft hover:bg-surface-soft"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-6">
                  {c.pts.length === 0 ? (
                    <div className="flex h-80 items-center justify-center text-sm text-subtle">
                      No data
                    </div>
                  ) : (
                    <MiniBarChart data={c.pts} format={c.fmt} large />
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </section>
  );
}
