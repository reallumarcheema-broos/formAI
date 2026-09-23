import { NextResponse, type NextRequest } from "next/server";
import { getOrigin } from "@/lib/billing/origin";
import { getStripe, isPaywallEnabled } from "@/lib/billing/stripe";
import { invalidateSubscriptionCache } from "@/lib/billing/subscription";
import { encodeProToken, PRO_COOKIE } from "@/lib/billing/token";

/**
 * GET /api/checkout/confirm?session_id=… — Stripe redirects here after payment.
 * We verify the session with Stripe (never trust the query string alone), then
 * store a signed cookie linking this browser to the subscription.
 */
export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!isPaywallEnabled() || !sessionId) return NextResponse.redirect(`${origin}/pricing`, 303);

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (session.mode !== "subscription" || session.status !== "complete" || !customerId || !subscriptionId) {
      return NextResponse.redirect(`${origin}/pricing?error=incomplete`, 303);
    }

    invalidateSubscriptionCache(subscriptionId);
    const response = NextResponse.redirect(`${origin}/account?welcome=1`, 303);
    response.cookies.set(PRO_COOKIE, encodeProToken({ customerId, subscriptionId, iat: Math.floor(Date.now() / 1000) }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400, // browsers cap cookies at 400 days
    });
    return response;
  } catch (err) {
    console.error("[FormAI] Checkout confirmation failed", err);
    return NextResponse.redirect(`${origin}/pricing?error=checkout`, 303);
  }
}
