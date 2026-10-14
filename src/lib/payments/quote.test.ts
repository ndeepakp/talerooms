import { describe, expect, it } from "vitest";
import { quoteStoryPurchase, toMinorUnits, type PurchasableStory } from "./quote";

const story: PurchasableStory = {
  authorId: "author", status: "published", chaptersPublic: false, currency: "SGD",
  offeredDurations: ["1d", "always"], wholePrices: { "1d": 25 },
  chapters: [{ prices: { "1d": 7 } }, { prices: { "1d": 9 } }],
};
const whole = { scope: "whole", duration: "1d" };

describe("purchase quotes", () => {
  it("uses server prices/currency despite client overrides", () => {
    const quote = quoteStoryPurchase(story, "reader", { ...whole, amount: 1, currency: "JPY", discount: 100 });
    expect(quote.currency).toBe("SGD");
    expect(quote.amountMinor).toBe(2500);
  });
  it("quotes selected chapters once in stable order", () => {
    const quote = quoteStoryPurchase(story, "reader", { scope: "chapters", duration: "1d", chapterIndexes: [1, 0, 1] });
    expect(quote.amountMinor).toBe(1600);
    expect(quote.items.map(item => item.chapterIndex)).toEqual([0, 1]);
  });
  it("keeps the existing server-established renewal discount rounding", () => {
    expect(quoteStoryPurchase(story, "reader", whole, true).amountMinor).toBe(1900);
  });
  it("handles JPY without multiplying its price by 100", () => {
    expect(quoteStoryPurchase({ ...story, currency: "JPY" }, "reader", whole).amountMinor).toBe(25);
  });
  it("allows an explicit zero-priced item without fabricating payment", () => {
    expect(quoteStoryPurchase({ ...story, wholePrices: { "1d": 0 } }, "reader", whole).amountMinor).toBe(0);
  });
  it("rejects invalid and unavailable chapter selections", () => {
    for (const indexes of [[], [-1], [2], [0.5], ["0"], [null]]) {
      expect(() => quoteStoryPurchase(story, "reader", { scope: "chapters", duration: "1d", chapterIndexes: indexes })).toThrow();
    }
    expect(() => quoteStoryPurchase(story, "reader", { scope: "chapters", duration: "always", chapterIndexes: [0] })).toThrow();
  });
  it("rejects drafts, public content, self purchases and unavailable terms", () => {
    expect(() => quoteStoryPurchase({ ...story, status: "draft" }, "reader", whole)).toThrow();
    expect(() => quoteStoryPurchase({ ...story, chaptersPublic: true }, "reader", whole)).toThrow();
    expect(() => quoteStoryPurchase(story, "author", whole)).toThrow();
    expect(() => quoteStoryPurchase(story, "reader", { ...whole, duration: "1h" })).toThrow();
    expect(() => quoteStoryPurchase({ ...story, currency: "INVALID" }, "reader", whole)).toThrow();
  });
  it("rejects invalid prices before discounting them", () => {
    for (const amount of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
      expect(() => quoteStoryPurchase({ ...story, wholePrices: { "1d": amount } }, "reader", whole, true)).toThrow();
    }
  });
  it("rejects a total that overflows even when individual prices are valid", () => {
    const price = Math.floor(Number.MAX_SAFE_INTEGER / 100);
    const large = { ...story, chapters: [{ prices: { "1d": price } }, { prices: { "1d": price } }] };
    expect(() => quoteStoryPurchase(large, "reader", { scope: "chapters", duration: "1d", chapterIndexes: [0, 1] })).toThrow();
  });
  it("converts all other supported currencies into hundredths", () => {
    for (const currency of ["INR", "USD", "EUR", "GBP", "SGD", "AUD", "CAD"] as const) expect(toMinorUnits(12, currency)).toBe(1200);
  });
});
