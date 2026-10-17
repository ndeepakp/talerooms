// Real provider integration is initially available only in the local sandbox.
// Live mode remains a separate release gate until refunds, disputes and subscriptions are validated.
export function stripeCheckoutEnabled() {
  return process.env.STRIPE_CHECKOUT_ENABLED === 'true';
}
