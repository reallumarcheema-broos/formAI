import { NextResponse } from "next/server";
import { getExercise } from "@/lib/exercises";
import { getOrigin } from "@/lib/billing/origin";
import { PRO_PLAN } from "@/lib/billing/plans";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { getProStatus } from "@/lib/billing/subscription";

/**
 * POST /api/checkout: start a Stripe Checkout session for FormAI Pro ($14.99/month)
 * and redirect the browser to Stripe's hosted payment page.
 *
 * Optional form field `exercise`: the workout (or "food" scanner) to open right after payment.
 */
export async function POST(request: Request) {
  const origin = getOrigin(request);
  if (!isStripeConfigured()) {
    return NextResponse.redirect(`${origin}/pricing?error=not-configured`, 303);
  }

  // Don't let an existing subscriber pay twice.
  const status = await getProStatus();
  if (status.isPro) return NextResponse.redirect(`${origin}/account`, 303);

  const form = await request.formData().catch(() => null);
  const exerciseField = form?.get("exercise");
  // Where to go after payment: a known exercise, or "food" for the food scanner.
  const next =
    exerciseField === "food" ? "food" : typeof exerciseField === "string" ? getExercise(exerciseField)?.id : undefined;

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

  const successUrl = new URL(`${origin}/api/checkout/confirm`);
  if (next) successUrl.searchParams.set("exercise", next);
  // Stripe substitutes this placeholder, so append it unencoded.
  const successHref = `${successUrl.toString()}${next ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [lineItem],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: successHref,
      cancel_url: `${origin}/pricing?canceled=1${next ? `&exercise=${next}` : ""}`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[FormAI] Checkout failed", err);
    return NextResponse.redirect(`${origin}/pricing?error=checkout`, 303);
  }
}
