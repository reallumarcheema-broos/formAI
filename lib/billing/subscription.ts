import "server-only";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { getStripe, isPaywallEnabled } from "./stripe";
import { decodeProToken, PRO_COOKIE, type ProToken } from "./token";

export interface ProStatus {
  /** False when Stripe isn't configured: every exercise is unlocked (local dev). */
  paywallEnabled: boolean;
  isPro: boolean;
  /** Present when this browser has a subscription on record (active or not). */
  token: ProToken | null;
  subscriptionStatus?: string;
  /** Epoch seconds; set when the subscription is scheduled to cancel. */
  cancelAt?: number | null;
}

/** Stripe statuses that still grant access. `past_due` keeps access during Stripe's retry window. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Small in-memory cache so we don't hit Stripe on every page view. */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; status: string; cancelAt: number | null }>();

async function lookupSubscription(id: string) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit;
  const sub = await getStripe().subscriptions.retrieve(id);
  const entry = { at: Date.now(), status: sub.status, cancelAt: sub.cancel_at ?? null };
  cache.set(id, entry);
  return entry;
}

/** Drop the cached status, e.g. right after checkout or a portal visit. */
export function invalidateSubscriptionCache(id: string): void {
  cache.delete(id);
}

/** Resolve whether the current request's browser has an active FormAI Pro subscription. */
export async function getProStatus(): Promise<ProStatus> {
  // Read cookies first so pages using this are always rendered per request,
  // even in builds where Stripe isn't configured yet.
  const cookieStore = await cookies();
  if (!isPaywallEnabled()) return { paywallEnabled: false, isPro: true, token: null };

  const token = decodeProToken(cookieStore.get(PRO_COOKIE)?.value);
  if (!token) return { paywallEnabled: true, isPro: false, token: null };

  try {
    const sub = await lookupSubscription(token.subscriptionId);
    return {
      paywallEnabled: true,
      isPro: ACTIVE_STATUSES.has(sub.status),
      token,
      subscriptionStatus: sub.status,
      cancelAt: sub.cancelAt,
    };
  } catch (err) {
    console.error("[FormAI] Failed to verify subscription", err);
    // A signed token proves this browser completed checkout. If Stripe says the
    // subscription doesn't exist, deny; if Stripe is just unreachable, don't
    // lock a paying customer out of their workout.
    const notFound = err instanceof Stripe.errors.StripeInvalidRequestError;
    return { paywallEnabled: true, isPro: !notFound, token };
  }
}

/** Is this exercise tier available to the current browser? */
export function canAccess(tier: "free" | "pro", status: ProStatus): boolean {
  return tier === "free" || status.isPro;
}
