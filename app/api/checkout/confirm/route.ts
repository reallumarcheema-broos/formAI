import { NextResponse, type NextRequest } from "next/server";
import { getOrigin } from "@/lib/billing/origin";
import { postPurchasePath } from "@/lib/billing/redirects";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { invalidateSubscriptionCache } from "@/lib/billing/subscription";
import { encodeProToken, PRO_COOKIE, PRO_COOKIE_OPTIONS } from "@/lib/billing/token";

/**
 * GET /api/checkout/confirm?session_id=…: Stripe redirects here after payment.
 * We verify the session with Stripe (never trust the query string alone), store
 * a signed cookie linking this browser to the subscription, then drop the user
 * straight into their workout.
 */
export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const params = request.nextUrl.searchParams;
  const sessionId = params.get("session_id");
  if (!isStripeConfigured() || !sessionId) return NextResponse.redirect(`${origin}/pricing`, 303);

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (session.mode !== "subscription" || session.status !== "complete" || !customerId || !subscriptionId) {
      return NextResponse.redirect(`${origin}/pricing?error=incomplete`, 303);
    }

    invalidateSubscriptionCache(subscriptionId);
    const response = NextResponse.redirect(`${origin}${postPurchasePath(params.get("exercise"))}`, 303);
    response.cookies.set(PRO_COOKIE, encodeProToken({ customerId, subscriptionId }), PRO_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error("[FormAI] Checkout confirmation failed", err);
    return NextResponse.redirect(`${origin}/pricing?error=checkout`, 303);
  }
}
