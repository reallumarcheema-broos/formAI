import { NextResponse } from "next/server";
import { getOrigin } from "@/lib/billing/origin";
import { getStripe, isPaywallEnabled } from "@/lib/billing/stripe";
import { getProStatus, invalidateSubscriptionCache } from "@/lib/billing/subscription";

/**
 * POST /api/billing-portal — open Stripe's hosted billing portal, where the
 * subscriber can update their card, see invoices or cancel.
 */
export async function POST(request: Request) {
  const origin = getOrigin(request);
  if (!isPaywallEnabled()) return NextResponse.redirect(`${origin}/account`, 303);

  const { token } = await getProStatus();
  if (!token) return NextResponse.redirect(`${origin}/pricing`, 303);

  try {
    // Their status may change in the portal; re-check with Stripe when they return.
    invalidateSubscriptionCache(token.subscriptionId);
    const portal = await getStripe().billingPortal.sessions.create({
      customer: token.customerId,
      return_url: `${origin}/account?refresh=1`,
    });
    return NextResponse.redirect(portal.url, 303);
  } catch (err) {
    console.error("[FormAI] Billing portal failed", err);
    return NextResponse.redirect(`${origin}/account?error=portal`, 303);
  }
}
