import { NextResponse } from "next/server";
import { PRO_PLAN } from "@/lib/billing/plans";
import { getOrigin } from "@/lib/billing/origin";
import { getStripe, isPaywallEnabled } from "@/lib/billing/stripe";

/**
 * POST /api/checkout — start a Stripe Checkout session for FormAI Pro ($14.99/month)
 * and redirect the browser to Stripe's hosted payment page.
 */
export async function POST(request: Request) {
  const origin = getOrigin(request);
  if (!isPaywallEnabled()) {
    return NextResponse.redirect(`${origin}/pricing?error=not-configured`, 303);
  }

  // Use a Price from the Stripe dashboard if provided; otherwise define it inline.
  const priceId = process.env.STRIPE_PRICE_ID;
  const lineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: PRO_PLAN.currency,
          unit_amount: PRO_PLAN.priceCents,
          recurring: { interval: PRO_PLAN.interval },
          product_data: { name: PRO_PLAN.name, description: "Real-time AI workout form coaching" },
        },
      };

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [lineItem],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${origin}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[FormAI] Checkout failed", err);
    return NextResponse.redirect(`${origin}/pricing?error=checkout`, 303);
  }
}
