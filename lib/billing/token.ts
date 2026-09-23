import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Small HMAC-signed tokens, so we can remember subscriptions without a
 * database. Format: base64url(json) + "." + base64url(hmac-sha256).
 *
 * A token only proves "this browser completed checkout for subscription X".
 * Whether X is still active is always re-checked against Stripe.
 */

/** Stored in the httpOnly `formai_pro` cookie after checkout. */
export interface ProToken {
  kind: "pro";
  customerId: string;
  subscriptionId: string;
  /** Issued-at, epoch seconds. */
  iat: number;
}

/** Short-lived link that lets a subscriber unlock Pro on another device. */
export interface LinkToken {
  kind: "link";
  customerId: string;
  subscriptionId: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

export const PRO_COOKIE = "formai_pro";
export const LINK_TTL_SECONDS = 10 * 60;

export class MissingSecretError extends Error {}

function secret(): Buffer {
  const explicit = process.env.FORMAI_COOKIE_SECRET;
  if (explicit) return Buffer.from(explicit);
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new MissingSecretError("Set FORMAI_COOKIE_SECRET or STRIPE_SECRET_KEY");
  // Derive a dedicated signing key rather than using the Stripe key directly.
  return createHmac("sha256", stripeKey).update("formai-cookie-signing-v1").digest();
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function encode(payload: ProToken | LinkToken): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(value: string | undefined | null): Record<string, unknown> | null {
  if (!value) return null;
  const [body, sig, extra] = value.split(".");
  if (!body || !sig || extra !== undefined) return null;
  let expected: Buffer;
  try {
    expected = Buffer.from(sign(body));
  } catch (err) {
    if (err instanceof MissingSecretError) return null;
    throw err;
  }
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (typeof p.customerId !== "string" || typeof p.subscriptionId !== "string") return null;
    return p;
  } catch {
    return null;
  }
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

type SubscriptionIds = { customerId: string; subscriptionId: string };

// Copy only the ids: callers may pass a whole token, whose `kind` must not leak through.
export function encodeProToken({ customerId, subscriptionId }: SubscriptionIds): string {
  return encode({ kind: "pro", customerId, subscriptionId, iat: nowSeconds() });
}

export function decodeProToken(value: string | undefined | null): ProToken | null {
  const p = decode(value);
  return p?.kind === "pro" ? (p as unknown as ProToken) : null;
}

export function encodeLinkToken({ customerId, subscriptionId }: SubscriptionIds): string {
  return encode({ kind: "link", customerId, subscriptionId, exp: nowSeconds() + LINK_TTL_SECONDS });
}

export function decodeLinkToken(value: string | undefined | null): LinkToken | null {
  const p = decode(value);
  if (p?.kind !== "link" || typeof p.exp !== "number" || p.exp < nowSeconds()) return null;
  return p as unknown as LinkToken;
}

/** Cookie options for the Pro cookie. */
export const PRO_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 400, // browsers cap cookies at 400 days
};
