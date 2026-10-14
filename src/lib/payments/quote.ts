import {
  isCurrency, isTier, RENEWAL_DISCOUNT_PCT,
  type CurrencyCode, type Tier,
} from "@/lib/pricing";

export class PaymentQuoteError extends Error {}

export type PurchasableStory = {
  authorId: string;
  status: string;
  chaptersPublic: boolean;
  currency: string;
  offeredDurations: string[];
  wholePrices: Record<string, number>;
  chapters: { prices?: Record<string, number> }[];
};

export type PurchaseItem = {
  scope: "whole" | "chapter";
  chapterIndex: number | null;
  duration: Tier;
  amountMajor: number;
  amountMinor: number;
};

/** Existing author prices are whole currency units. Processor amounts are
 * minor units; JPY has no fractional unit. Reject overflow before any checkout.
 */
export function toMinorUnits(amount: number, currency: CurrencyCode): number {
  const factor = currency === "JPY" ? 1 : 100;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > Math.floor(Number.MAX_SAFE_INTEGER / factor)) {
    throw new PaymentQuoteError("That price is invalid or too large.");
  }
  return amount * factor;
}

/** Quotes use database story data, never a client amount/currency. The caller
 * must establish eligibility for the returning-reader discount server-side.
 * Provider minimums, author payout readiness and order persistence belong to
 * checkout; this function neither charges money nor grants access.
 */
export function quoteStoryPurchase(
  story: PurchasableStory,
  buyerId: string,
  input: unknown,
  returningReader = false,
): { currency: CurrencyCode; amountMinor: number; items: PurchaseItem[] } {
  if (story.status !== "published") throw new PaymentQuoteError("That story is unavailable.");
  if (story.chaptersPublic) throw new PaymentQuoteError("These chapters are already free to read.");
  if (story.authorId === buyerId) throw new PaymentQuoteError("You cannot buy your own story.");
  if (!isCurrency(story.currency)) throw new PaymentQuoteError("That currency is unavailable.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new PaymentQuoteError("Choose what to buy.");
  const request = input as Record<string, unknown>;
  const duration = request.duration;
  if (!isTier(duration) || !story.offeredDurations.includes(duration)) throw new PaymentQuoteError("That access option is unavailable.");
  const currency = story.currency;
  const items: PurchaseItem[] = [];
  function add(scope: PurchaseItem["scope"], chapterIndex: number | null, price: unknown) {
    if (typeof price !== "number") throw new PaymentQuoteError("That item is not sold for this duration.");
    toMinorUnits(price, currency);
    // Preserve the existing whole-unit renewal rounding shown in the reader UI.
    const amountMajor = returningReader ? Math.round(price * ((100 - RENEWAL_DISCOUNT_PCT) / 100)) : price;
    items.push({ scope, chapterIndex, duration: duration as Tier, amountMajor, amountMinor: toMinorUnits(amountMajor, currency) });
  }
  if (request.scope === "whole") {
    add("whole", null, story.wholePrices[duration]);
  } else if (request.scope === "chapters") {
    if (!Array.isArray(request.chapterIndexes) || request.chapterIndexes.length === 0 ||
        request.chapterIndexes.some(index => !Number.isSafeInteger(index) || index < 0 || index >= story.chapters.length)) {
      throw new PaymentQuoteError("Choose valid chapters.");
    }
    for (const index of [...new Set(request.chapterIndexes as number[])].sort((a, b) => a - b)) {
      add("chapter", index, story.chapters[index].prices?.[duration]);
    }
  } else {
    throw new PaymentQuoteError("Choose what to buy.");
  }
  let amountMinor = 0;
  for (const item of items) {
    if (item.amountMinor > Number.MAX_SAFE_INTEGER - amountMinor) throw new PaymentQuoteError("That purchase total is too large.");
    amountMinor += item.amountMinor;
  }
  return { currency, amountMinor, items };
}
