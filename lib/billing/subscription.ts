import "server-only";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { getStripe, isPaywallEnabled, isStripeConfigured } from "./stripe";
import { decodeProToken, PRO_COOKIE, type ProToken } from "./token";

export interface ProStatus {
  /** False only in local development without Stripe keys: every workout is unlocked. */
  paywallEnabled: boolean;
  /** Stripe keys are present, so checkout can work. */
  stripeConfigured: boolean;
  isPro: boolean;
  /** Present when this browser has a subscription on record (active or not). */
  token: ProToken | null;
  subscriptionStatus?: string;
  /** Epoch seconds; set when the subscription is scheduled to cancel. */
  cancelAt?: number | null;
}

/** Stripe statuses that grant access. `past_due` keeps access during Stripe's payment retry window. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Small in-memory cache so we don't hit Stripe on every page view. */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; status: string; cancelAt: number | null }>();

export interface SubscriptionCheck {
  active: boolean;
  status?: string;
  cancelAt?: number | null;
}

/** Ask Stripe (via a short cache) whether a subscription currently grants access. */
export async function checkSubscription(id: string): Promise<SubscriptionCheck> {
  try {
    let entry = cache.get(id);
    if (!entry || Date.now() - entry.at >= CACHE_TTL_MS) {
      const sub = await getStripe().subscriptions.retrieve(id);
      entry = { at: Date.now(), status: sub.status, cancelAt: sub.cancel_at ?? null };
      cache.set(id, entry);
    }
    return { active: ACTIVE_STATUSES.has(entry.status), status: entry.status, cancelAt: entry.cancelAt };
  } catch (err) {
    console.error("[FormAI] Failed to verify subscription", err);
    // A signed token proves this browser completed checkout. If Stripe says the
    // subscription doesn't exist, deny; if Stripe is just unreachable, don't
    // lock a paying customer out of their workout.
    const notFound = err instanceof Stripe.errors.StripeInvalidRequestError;
    return { active: !notFound };
  }
}

/** Drop the cached status, e.g. right after checkout or a billing-portal visit. */
export function invalidateSubscriptionCache(id: string): void {
  cache.delete(id);
}

/** Resolve whether the current request's browser has an active FormAI Pro subscription. */
export async function getProStatus(): Promise<ProStatus> {
  // Read cookies first so pages using this always render per request.
  const cookieStore = await cookies();
  const stripeConfigured = isStripeConfigured();
  if (!isPaywallEnabled()) return { paywallEnabled: false, stripeConfigured, isPro: true, token: null };
  if (!stripeConfigured) return { paywallEnabled: true, stripeConfigured, isPro: false, token: null };

  const token = decodeProToken(cookieStore.get(PRO_COOKIE)?.value);
  if (!token) return { paywallEnabled: true, stripeConfigured, isPro: false, token: null };

  const sub = await checkSubscription(token.subscriptionId);
  return {
    paywallEnabled: true,
    stripeConfigured,
    isPro: sub.active,
    token,
    subscriptionStatus: sub.status,
    cancelAt: sub.cancelAt,
  };
}

/** Is this exercise tier available to the current browser? */
export function canAccess(tier: "free" | "pro", status: ProStatus): boolean {
  return tier === "free" || status.isPro;
}
