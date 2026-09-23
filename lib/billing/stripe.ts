import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Payments are enabled only when a Stripe secret key is configured. */
export function isPaywallEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: "FormAI" } });
  return client;
}
