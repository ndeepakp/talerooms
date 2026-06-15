import { describe, it, expect } from "vitest";
import {
  ACCENTS,
  BACKGROUNDS,
  DEFAULT_APPEARANCE,
  isThemeMode,
  isAccent,
  isBackground,
} from "./appearance";

describe("isThemeMode", () => {
  it("accepts the three modes", () => {
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("system")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isThemeMode("auto")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(1)).toBe(false);
  });
});

describe("isAccent / isBackground", () => {
  it("accepts every defined id", () => {
    for (const a of ACCENTS) expect(isAccent(a.id)).toBe(true);
    for (const b of BACKGROUNDS) expect(isBackground(b.id)).toBe(true);
  });
  it("rejects unknown ids", () => {
    expect(isAccent("turquoise")).toBe(false);
    expect(isBackground("midnight")).toBe(false);
  });
});

describe("appearance option lists", () => {
  it("has unique accent and background ids", () => {
    const accentIds = ACCENTS.map((a) => a.id);
    const bgIds = BACKGROUNDS.map((b) => b.id);
    expect(new Set(accentIds).size).toBe(accentIds.length);
    expect(new Set(bgIds).size).toBe(bgIds.length);
  });
});

describe("DEFAULT_APPEARANCE", () => {
  it("uses values that pass the guards", () => {
    expect(isThemeMode(DEFAULT_APPEARANCE.themeMode)).toBe(true);
    expect(isAccent(DEFAULT_APPEARANCE.accent)).toBe(true);
    expect(isBackground(DEFAULT_APPEARANCE.background)).toBe(true);
    expect(DEFAULT_APPEARANCE.feedWallpaper).toBeNull();
  });
});
