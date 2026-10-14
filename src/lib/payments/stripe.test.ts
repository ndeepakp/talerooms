import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildStoryCheckout, stripeClient, verifyStripeEvent } from "./stripe";
import { quoteStoryPurchase } from "./quote";

afterEach(() => vi.unstubAllEnvs());
const quote = quoteStoryPurchase({ authorId: "writer", status: "published", chaptersPublic: false,
  currency: "SGD", offeredDurations: ["1d"], wholePrices: { "1d": 25 }, chapters: [] }, "reader", { scope: "whole", duration: "1d" });
const checkout = { ...quote, orderId: "00000000-0000-4000-8000-000000000001", authorId: "writer", title: "A story",
  origin: "https://talerooms.fly.dev", platformFeeBps: 1000,
  approvedCountries: ["SG", "US"], account: { id: "acct_example", authorId: "writer", country: "SG", chargesEnabled: true, payoutsEnabled: true } };

describe("Stripe payment foundation", () => {
  it("builds author-scoped checkout with a stable retry key and server quote", () => {
    const result = buildStoryCheckout(checkout);
    expect(result.options.stripeAccount).toBe("acct_example");
    expect(result.options.idempotencyKey).toContain(checkout.orderId);
    expect(result.params.line_items?.[0].price_data?.unit_amount).toBe(2500);
    expect(result.params.payment_intent_data?.application_fee_amount).toBe(250);
    expect(result.params.metadata?.talerooms_order_id).toBe(checkout.orderId);
  });
  it("does not assume overseas countries or incomplete author accounts are ready", () => {
    for (const account of [{ ...checkout.account, country: "IN" }, { ...checkout.account, chargesEnabled: false },
      { ...checkout.account, payoutsEnabled: false }, { ...checkout.account, authorId: "other" }]) {
      expect(() => buildStoryCheckout({ ...checkout, account })).toThrow();
    }
  });
  it("rejects free checkout, mismatched totals and insecure return addresses", () => {
    expect(() => buildStoryCheckout({ ...checkout, amountMinor: 1 })).toThrow();
    expect(() => buildStoryCheckout({ ...checkout, amountMinor: 0, items: [] })).toThrow();
    expect(() => buildStoryCheckout({ ...checkout, origin: "http://external.example" })).toThrow();
    expect(() => buildStoryCheckout({ ...checkout, platformFeeBps: 10000 })).toThrow();
  });
  it("requires explicit live configuration and matching credentials", () => {
    vi.stubEnv("STRIPE_MODE", "test"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_not_a_real_key");
    expect(() => stripeClient()).toThrow();
    vi.stubEnv("STRIPE_SECRET_KEY", ""); expect(() => stripeClient()).toThrow();
  });
  it("verifies signed test events without calling Stripe", () => {
    vi.stubEnv("STRIPE_MODE", "test"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_not_a_real_key");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_local_test");
    const payload = JSON.stringify({ id: "evt_local", type: "checkout.session.completed", livemode: false, data: { object: { id: "cs_local" } } });
    const sdk = new Stripe("sk_test_not_a_real_key");
    const signature = sdk.webhooks.generateTestHeaderString({ payload, secret: "whsec_local_test" });
    expect(verifyStripeEvent(payload, signature).id).toBe("evt_local");
    expect(() => verifyStripeEvent(payload + " ", signature)).toThrow();
  });
  it("rejects expired signatures and live events in test mode", () => {
    vi.stubEnv("STRIPE_MODE", "test"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_not_a_real_key");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_local_test");
    const sdk = new Stripe("sk_test_not_a_real_key");
    const payload = JSON.stringify({ id: "evt_local", type: "checkout.session.completed", livemode: true, data: { object: {} } });
    const expired = sdk.webhooks.generateTestHeaderString({ payload, secret: "whsec_local_test", timestamp: Math.floor(Date.now() / 1000) - 600 });
    expect(() => verifyStripeEvent(payload, expired)).toThrow();
    const signature = sdk.webhooks.generateTestHeaderString({ payload, secret: "whsec_local_test" });
    expect(() => verifyStripeEvent(payload, signature)).toThrow("mode");
  });
});
