import { formatPrice, TIER_LABELS, type Tier } from "@/lib/pricing";

export type ChapterAccessAction = { href: string; label: string; detail: string };

// Quotes are display hints only; the purchase API recalculates prices and access.
export function chapterAccessAction({ storyHref, index, offered, prices, wholePrices, currency, discount = 0, stripeCheckout = false }: {
  storyHref: string; index: number; offered: Tier[];
  prices: Partial<Record<Tier, number>>; wholePrices: Partial<Record<Tier, number>>;
  currency: string; discount?: number; stripeCheckout?: boolean;
}): ChapterAccessAction | undefined {
  const tier = offered.find(t => typeof prices[t] === "number") ?? offered.find(t => typeof wholePrices[t] === "number");
  if (!tier) return undefined;
  const individual = typeof prices[tier] === "number";
  const price = individual ? prices[tier]! : wholePrices[tier]!;
  return {
    href: `${storyHref}?chapter=${index}&buy=${index}#chapter-access`,
    label: individual ? "Unlock this chapter" : "Unlock with whole story",
    detail: `${formatPrice(Math.round(price * (100 - discount) / 100), currency)} · ${tier === "always" ? "Permanent access" : `${TIER_LABELS[tier]} access`}${individual ? "" : " · All chapters"} · ${stripeCheckout ? "Stripe sandbox" : "Demo, no charge"}`,
  };
}
