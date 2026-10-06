import { type ShelfStyle } from "@/lib/appearance";

// Match the slim display ledges rather than the retired wooden planks.
const FINISH: Record<ShelfStyle, string> = {
  walnut: "#a78b70", oak: "#c7ad80", ebony: "#747482", minimal: "var(--border-strong)",
};

// A few mini "books" standing on the plank.
const BOOKS = [
  { bg: "#6366f1", br: "#4f46e5", h: 38 },
  { bg: "#1d9e75", br: "#0f6e56", h: 30 },
  { bg: "#f43f5e", br: "#e11d48", h: 34 },
];

// Small bookshelf preview that re-renders with the currently-selected finish.
export function ShelfPreview({ shelf }: { shelf: ShelfStyle }) {
  const tint = FINISH[shelf];
  return (
    <div
      aria-hidden="true"
      className="flex w-[108px] shrink-0 flex-col justify-end rounded-xl border border-ui bg-surface p-3"
    >
      <div className="flex items-end justify-center gap-1.5" style={{ height: 40 }}>
        {BOOKS.map((b, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: b.h,
              background: b.bg,
              border: `1.5px solid ${b.br}`,
              borderRadius: "1px 2px 2px 1px",
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: 2,
          marginTop: 5,
          borderRadius: 99,
          background: `color-mix(in srgb, ${tint} 45%, var(--surface))`,
        }}
      />
    </div>
  );
}
