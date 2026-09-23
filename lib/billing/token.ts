import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A tiny signed token stored in an httpOnly cookie after checkout, so we can
 * remember which Stripe subscription belongs to this browser without a
 * database. Format: base64url(json) + "." + base64url(hmac-sha256).
 *
 * The token only proves "this browser completed checkout for subscription X".
 * Whether X is still active is always re-checked against Stripe.
 */
export interface ProToken {
  customerId: string;
  subscriptionId: string;
  /** Issued-at, epoch seconds. */
  iat: number;
}

export const PRO_COOKIE = "formai_pro";

function secret(): Buffer {
  const explicit = process.env.FORMAI_COOKIE_SECRET;
  if (explicit) return Buffer.from(explicit);
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Set FORMAI_COOKIE_SECRET or STRIPE_SECRET_KEY");
  // Derive a dedicated signing key rather than using the Stripe key directly.
  return createHmac("sha256", stripeKey).update("formai-cookie-signing-v1").digest();
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeProToken(token: ProToken): string {
  const body = Buffer.from(JSON.stringify(token)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeProToken(value: string | undefined): ProToken | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ProToken;
    if (typeof parsed.customerId !== "string" || typeof parsed.subscriptionId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
