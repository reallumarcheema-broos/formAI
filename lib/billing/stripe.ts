import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Is the paywall on? FormAI is a paid product, so it fails closed:
 *  - production: always on (even if Stripe is misconfigured, nobody gets free access)
 *  - development: on once STRIPE_SECRET_KEY is set; off otherwise so you can
 *    work on pose tracking without Stripe keys
 *  - FORMAI_DISABLE_PAYWALL=true turns it off explicitly (e.g. a private demo)
 */
export function isPaywallEnabled(): boolean {
  if (process.env.FORMAI_DISABLE_PAYWALL === "true") return false;
  return isStripeConfigured() || process.env.NODE_ENV === "production";
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) {
    const config: Stripe.StripeConfig = { appInfo: { name: "FormAI" } };
    // Optional: point the SDK at stripe-mock or a local fake for automated tests.
    const apiBase = process.env.STRIPE_API_BASE;
    if (apiBase) {
      const url = new URL(apiBase);
      config.host = url.hostname;
      config.port = url.port || (url.protocol === "https:" ? 443 : 80);
      config.protocol = url.protocol === "https:" ? "https" : "http";
    }
    client = new Stripe(key, config);
  }
  return client;
}
