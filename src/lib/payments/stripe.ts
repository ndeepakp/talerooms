import Stripe from "stripe";
import { PaymentQuoteError, type PurchaseItem } from "./quote";
import { TIER_LABELS, type CurrencyCode } from "@/lib/pricing";

export function stripeClient() {
  const mode = process.env.STRIPE_MODE || "test";
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !["test", "live"].includes(mode) || !key.startsWith(`sk_${mode}_`)) {
    throw new Error("Stripe payment credentials are not configured for this mode.");
  }
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 10000 });
}

/** Verify the unmodified body and environment before dispatching any event. */
export function verifyStripeEvent(payload: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) throw new Error("Stripe webhook verification is not configured.");
  const event = stripeClient().webhooks.constructEvent(payload, signature, secret);
  if (event.livemode !== (process.env.STRIPE_MODE === "live")) throw new Error("Stripe event mode does not match.");
  return event;
}

type CheckoutInput = {
  orderId: string;
  authorId: string;
  title: string;
  currency: CurrencyCode;
  amountMinor: number;
  items: PurchaseItem[];
  origin: string;
  platformFeeBps: number;
  // Retrieved server-side from the author's Stripe account, not request JSON.
  account: { id: string; authorId: string; country: string; chargesEnabled: boolean; payoutsEnabled: boolean };
  // Operator/provider-approved launch countries. No implicit global eligibility.
  approvedCountries: string[];
};

/** Build immutable, author-scoped Checkout parameters. Provider calls and
 * transactional fulfillment live in orders.ts. */
export function buildStoryCheckout(input: CheckoutInput): {
  params: Stripe.Checkout.SessionCreateParams;
  options: Stripe.RequestOptions;
} {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.orderId) || !/^acct_[A-Za-z0-9]+$/.test(input.account.id)) throw new PaymentQuoteError("Invalid payment reference.");
  if (input.account.authorId !== input.authorId || !input.account.chargesEnabled || !input.account.payoutsEnabled ||
      !input.approvedCountries.includes(input.account.country)) throw new PaymentQuoteError("Author payments are not ready for this country.");
  const origin = new URL(input.origin);
  if (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname))) throw new PaymentQuoteError("A secure payment return address is required.");
  if (!Number.isInteger(input.platformFeeBps) || input.platformFeeBps < 0 || input.platformFeeBps > 9999) throw new PaymentQuoteError("Invalid platform fee.");
  const total = input.items.reduce((sum, item) => sum + item.amountMinor, 0);
  if (!input.items.length || input.items.length > 100 || !Number.isSafeInteger(total) || total <= 0 || total !== input.amountMinor ||
      input.items.some(item => !Number.isSafeInteger(item.amountMinor) || item.amountMinor < 0)) throw new PaymentQuoteError("Invalid checkout total.");
  const fee = Math.floor(total * (input.platformFeeBps / 10000));
  const metadata = { talerooms_order_id: input.orderId };
  return {
    options: { stripeAccount: input.account.id, idempotencyKey: `story-order:${input.orderId}` },
    params: {
      mode: "payment", allowed_payment_method_types: ["card"], client_reference_id: input.orderId,
      success_url: `${origin.origin}/payments/return?order=${input.orderId}`,
      cancel_url: `${origin.origin}/payments/return?order=${input.orderId}&cancelled=1`,
      metadata,
      payment_intent_data: { metadata, ...(fee > 0 ? { application_fee_amount: fee } : {}) },
      line_items: input.items.map(item => ({
        quantity: 1,
        price_data: { currency: input.currency.toLowerCase(), unit_amount: item.amountMinor,
          product_data: { name: `${input.title.slice(0, 100)} · ${item.scope === "whole" ? "Whole story" : `Chapter ${item.chapterIndex! + 1}`}`,
            description: `${TIER_LABELS[item.duration]} access` } },
      })),
    },
  };
}
