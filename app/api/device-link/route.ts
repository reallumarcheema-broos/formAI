import { NextResponse, type NextRequest } from "next/server";
import { getOrigin } from "@/lib/billing/origin";
import { checkSubscription, invalidateSubscriptionCache } from "@/lib/billing/subscription";
import { decodeLinkToken, encodeProToken, PRO_COOKIE, PRO_COOKIE_OPTIONS } from "@/lib/billing/token";

/**
 * GET /api/device-link?t=…: open a link (or scan the QR code) generated on the
 * Account page of a subscribed device to unlock Pro on this device too.
 */
export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const link = decodeLinkToken(request.nextUrl.searchParams.get("t"));
  if (!link) return NextResponse.redirect(`${origin}/pricing?error=link-invalid`, 303);

  invalidateSubscriptionCache(link.subscriptionId);
  const sub = await checkSubscription(link.subscriptionId);
  if (!sub.active) return NextResponse.redirect(`${origin}/pricing?error=link-inactive`, 303);

  const response = NextResponse.redirect(`${origin}/?welcome=device`, 303);
  response.cookies.set(
    PRO_COOKIE,
    encodeProToken({ customerId: link.customerId, subscriptionId: link.subscriptionId }),
    PRO_COOKIE_OPTIONS,
  );
  // The link is a bearer credential: keep it out of caches and referrers.
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
