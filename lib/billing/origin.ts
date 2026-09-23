import "server-only";

/** Absolute origin for Stripe redirect URLs. Prefer an explicit site URL in production. */
export function getOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}
