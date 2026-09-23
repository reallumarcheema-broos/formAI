import { createHmac } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { E2E_COOKIE_SECRET, MOCK_STRIPE } from "./constants";

export { MOCK_STRIPE };

/** Mirrors lib/billing/token.ts so tests can mint (or forge) tokens. */
export function signToken(payload: Record<string, unknown>, secret = E2E_COOKIE_SECRET): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function proCookie(subscriptionId: string, customerId = "cus_seed"): string {
  return signToken({ kind: "pro", customerId, subscriptionId, iat: Math.floor(Date.now() / 1000) });
}

/** Give a browser context the seeded, active subscription (skips checkout). */
export async function subscribe(context: BrowserContext, baseURL: string, subscriptionId = "sub_seed_active") {
  await context.addCookies([{ name: "formai_pro", value: proCookie(subscriptionId), url: baseURL, httpOnly: true }]);
}

export async function resetStripe(): Promise<void> {
  await fetch(`${MOCK_STRIPE}/__test/reset`, { method: "POST" });
}

export async function stripeState(): Promise<{
  sessions: { id: string; status: string; params: Record<string, string>; subscription?: string }[];
  subscriptions: { id: string; status: string; customer: string }[];
}> {
  return (await fetch(`${MOCK_STRIPE}/__test/state`)).json();
}
