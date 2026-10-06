import { describe, expect, it } from "vitest";
import { chapterPosition, DEFAULT_READER_PREFERENCES, normalizeReaderPreferences } from "./reader-preferences";

describe("stored reader preferences", () => {
  it("recovers from missing, invalid, or outdated settings", () => {
    expect(normalizeReaderPreferences(null)).toEqual(DEFAULT_READER_PREFERENCES);
    expect(normalizeReaderPreferences({ font: "missing-font", theme: "unknown", fontSize: "20", lineHeight: NaN, dropCap: "yes" })).toEqual(DEFAULT_READER_PREFERENCES);
  });
  it("bounds sizes without discarding valid settings", () => {
    expect(normalizeReaderPreferences({ font: "sans", theme: "oled", fontSize: 100, lineHeight: 0, dropCap: true })).toEqual({ font: "sans", theme: "oled", fontSize: 24, lineHeight: 1.4, dropCap: true });
    expect(normalizeReaderPreferences({ fontSize: -12, lineHeight: 10 })).toMatchObject({ fontSize: 14, lineHeight: 2.2 });
  });
});

describe("chapter position", () => {
  it("uses word position rather than claiming the current page is complete", () => {
    expect(chapterPosition([200, 400, 100], 0)).toEqual({ percent: 0, minutesRemaining: 4 });
    expect(chapterPosition([200, 400, 100], 2)).toEqual({ percent: 86, minutesRemaining: 1 });
  });
  it("handles empty content and stale page indexes", () => {
    expect(chapterPosition([], 20)).toEqual({ percent: 0, minutesRemaining: 0 });
    expect(chapterPosition([200, 200], 100)).toEqual({ percent: 50, minutesRemaining: 1 });
    expect(chapterPosition([200, 200], -10)).toEqual({ percent: 0, minutesRemaining: 2 });
  });
});
