import { describe, it, expect } from "vitest";
import {
  TIERS,
  CURRENCY,
  isTier,
  formatPrice,
  expiryFor,
  normalizePrices,
  normalizeOfferedDurations,
} from "./pricing";

describe("isTier", () => {
  it("accepts every canonical tier", () => {
    for (const t of TIERS) expect(isTier(t)).toBe(true);
  });
  it("rejects non-strings and unknown strings", () => {
    expect(isTier("1m")).toBe(false);
    expect(isTier("")).toBe(false);
    expect(isTier(null)).toBe(false);
    expect(isTier(1)).toBe(false);
    expect(isTier(undefined)).toBe(false);
  });
});

describe("formatPrice", () => {
  it("shows Free for zero or negative", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(-5)).toBe("Free");
  });
  it("prefixes the currency for positive amounts", () => {
    expect(formatPrice(5)).toBe(`${CURRENCY}5`);
    expect(formatPrice(199)).toBe(`${CURRENCY}199`);
  });
});

describe("expiryFor", () => {
  const from = new Date("2026-01-01T00:00:00.000Z");

  it("returns null for the always tier", () => {
    expect(expiryFor("always", from)).toBeNull();
  });

  it("adds the right offset for each timed tier", () => {
    expect(expiryFor("1h", from)!.getTime() - from.getTime()).toBe(3_600_000);
    expect(expiryFor("1d", from)!.getTime() - from.getTime()).toBe(86_400_000);
    expect(expiryFor("1w", from)!.getTime() - from.getTime()).toBe(604_800_000);
    expect(expiryFor("1y", from)!.getTime() - from.getTime()).toBe(31_536_000_000);
  });

  it("defaults to now and returns a future date", () => {
    const before = Date.now();
    const exp = expiryFor("1h");
    expect(exp).not.toBeNull();
    expect(exp!.getTime()).toBeGreaterThanOrEqual(before + 3_600_000 - 1000);
  });
});

describe("normalizePrices", () => {
  it("keeps only offered tiers and floors to integers", () => {
    const out = normalizePrices({ "1h": 10.9, "1d": 5, "1w": 3 }, ["1h", "1d"]);
    expect(out).toEqual({ "1h": 10, "1d": 5 });
  });
  it("drops negative, NaN and non-numeric values", () => {
    const out = normalizePrices({ "1h": -1, "1d": "abc", "1w": 7 }, ["1h", "1d", "1w"]);
    expect(out).toEqual({ "1w": 7 });
  });
  it("coerces numeric strings", () => {
    expect(normalizePrices({ "1h": "12" }, ["1h"])).toEqual({ "1h": 12 });
  });
  it("returns an empty object for non-object input", () => {
    expect(normalizePrices(null, ["1h"])).toEqual({});
    expect(normalizePrices("nope", ["1h"])).toEqual({});
    expect(normalizePrices(undefined, TIERS)).toEqual({});
  });
});

describe("normalizeOfferedDurations", () => {
  it("returns [] for non-arrays", () => {
    expect(normalizeOfferedDurations("1h")).toEqual([]);
    expect(normalizeOfferedDurations(null)).toEqual([]);
  });
  it("filters invalid entries and dedupes", () => {
    expect(normalizeOfferedDurations(["1h", "bad", "1h", 5])).toEqual(["1h"]);
  });
  it("returns canonical order regardless of input order", () => {
    expect(normalizeOfferedDurations(["always", "1h", "1w"])).toEqual([
      "1h",
      "1w",
      "always",
    ]);
  });
});
