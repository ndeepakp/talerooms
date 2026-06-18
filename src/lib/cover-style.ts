// Designed-template cover palettes for stories without an uploaded image. The
// "generated cover" is just the title + author set on one of these palettes —
// instant, free, on-brand, no external image service.

export type CoverStyle = { palette: number };

export const COVER_PALETTES: { bg: string; fg: string; accent: string }[] = [
  { bg: "#1e293b", fg: "#f8fafc", accent: "#f59e0b" }, // slate + amber
  { bg: "#7c2d12", fg: "#fff7ed", accent: "#fdba74" }, // rust
  { bg: "#14532d", fg: "#f0fdf4", accent: "#86efac" }, // forest
  { bg: "#312e81", fg: "#eef2ff", accent: "#a5b4fc" }, // indigo
  { bg: "#581c87", fg: "#faf5ff", accent: "#d8b4fe" }, // plum
  { bg: "#7f1d1d", fg: "#fef2f2", accent: "#fca5a5" }, // crimson
  { bg: "#0c4a6e", fg: "#f0f9ff", accent: "#7dd3fc" }, // ocean
  { bg: "#3f3f46", fg: "#fafafa", accent: "#e4e4e7" }, // graphite
];

// A stable default palette derived from the title, so a story's generated cover
// is consistent rather than random.
export function defaultPalette(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % COVER_PALETTES.length;
}

// Normalise an untrusted value into a valid CoverStyle, or null.
export function normalizeCoverStyle(input: unknown): CoverStyle | null {
  if (!input || typeof input !== "object") return null;
  const p = (input as { palette?: unknown }).palette;
  if (typeof p !== "number" || !Number.isInteger(p) || p < 0) return null;
  return { palette: p % COVER_PALETTES.length };
}
