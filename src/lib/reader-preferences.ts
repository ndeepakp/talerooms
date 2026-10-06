export type ReaderPreferences = {
  font: "serif" | "sans" | "mono";
  fontSize: number;
  lineHeight: number;
  theme: "paper" | "sepia" | "night" | "oled";
  dropCap: boolean;
};

export const READER_STORAGE_KEY = "talerooms:reader-preferences:v1";
export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  font: "serif", fontSize: 18, lineHeight: 1.85, theme: "paper", dropCap: false,
};

/** Stored browser preferences are untrusted and may come from an older version. */
export function normalizeReaderPreferences(input: unknown): ReaderPreferences {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const defaults = DEFAULT_READER_PREFERENCES;
  const bounded = (n: unknown, min: number, max: number, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  return {
    font: value.font === "sans" || value.font === "mono" ? value.font : defaults.font,
    fontSize: Math.round(bounded(value.fontSize, 14, 24, defaults.fontSize)),
    lineHeight: bounded(value.lineHeight, 1.4, 2.2, defaults.lineHeight),
    theme: value.theme === "sepia" || value.theme === "night" || value.theme === "oled" ? value.theme : defaults.theme,
    dropCap: typeof value.dropCap === "boolean" ? value.dropCap : defaults.dropCap,
  };
}

/** A page position is not proof that the page, chapter, or story was read. */
export function chapterPosition(pageWords: number[], pageIndex: number) {
  const counts = pageWords.map(n => Number.isFinite(n) ? Math.max(0, n) : 0);
  const index = Math.min(Math.max(0, Math.floor(pageIndex) || 0), Math.max(0, counts.length - 1));
  const total = counts.reduce((a, b) => a + b, 0);
  const before = counts.slice(0, index).reduce((a, b) => a + b, 0);
  return {
    percent: total ? Math.round(before / total * 100) : 0,
    minutesRemaining: total ? Math.max(1, Math.ceil((total - before) / 200)) : 0,
  };
}
