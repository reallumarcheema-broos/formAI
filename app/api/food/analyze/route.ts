import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeFoodPhoto, FoodDeclinedError, isFoodScanConfigured, type ImageMediaType } from "@/lib/food/analyze";
import { takeScan } from "@/lib/food/rateLimit";
import type { FoodApiError } from "@/lib/food/types";
import { getProStatus } from "@/lib/billing/subscription";

/** ~3 MB of base64. The client downsizes photos to ~1024px JPEG (~150 KB) first. */
const MAX_BASE64_LENGTH = 4_000_000;
const MEDIA_TYPES = new Set<ImageMediaType>(["image/jpeg", "image/png", "image/webp"]);

const fail = (error: FoodApiError, status: number) => NextResponse.json({ error }, { status });

/**
 * POST /api/food/analyze  { image: <base64>, mediaType: "image/jpeg" }
 * Returns the estimated foods, calories and macros. Subscribers only.
 * The photo is sent to Anthropic for analysis and is not stored by FormAI.
 */
export async function POST(request: Request) {
  if (!isFoodScanConfigured()) return fail("not-configured", 503);

  const status = await getProStatus();
  if (!status.isPro) return fail("not-subscribed", 402);

  const body = (await request.json().catch(() => null)) as { image?: unknown; mediaType?: unknown } | null;
  const image = typeof body?.image === "string" ? body.image : "";
  const mediaType = body?.mediaType as ImageMediaType;
  if (!image || image.length > MAX_BASE64_LENGTH || !MEDIA_TYPES.has(mediaType) || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return fail("bad-image", 400);
  }

  if (!takeScan(status.token?.subscriptionId ?? "local")) return fail("rate-limited", 429);

  try {
    const analysis = await analyzeFoodPhoto(image, mediaType);
    return NextResponse.json(analysis, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof FoodDeclinedError) return fail("declined", 422);
    if (err instanceof Anthropic.BadRequestError) {
      console.error("[FormAI] Food analysis rejected", err.message);
      return fail("bad-image", 400);
    }
    if (err instanceof Anthropic.RateLimitError) return fail("rate-limited", 429);
    console.error("[FormAI] Food analysis failed", err);
    return fail("failed", 502);
  }
}
