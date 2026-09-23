import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PRO_PLAN } from "@/lib/billing/plans";
import { getProStatus, invalidateSubscriptionCache } from "@/lib/billing/subscription";
import { decodeProToken, encodeLinkToken, LINK_TTL_SECONDS, PRO_COOKIE } from "@/lib/billing/token";

export const metadata: Metadata = { title: "Account" };

async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  if (params.refresh) {
    // Back from the Stripe portal: the plan may have changed.
    const token = decodeProToken((await cookies()).get(PRO_COOKIE)?.value);
    if (token) invalidateSubscriptionCache(token.subscriptionId);
  }
  const status = await getProStatus();
  const isPro = status.paywallEnabled && status.isPro;

  // "Use on another device": a 10-minute signed link, shown as a QR code.
  let deviceLink: { url: string; qrSvg: string } | null = null;
  if (isPro && status.token && params.link) {
    const url = `${await siteOrigin()}/api/device-link?t=${encodeLinkToken(status.token)}`;
    const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
    deviceLink = { url, qrSvg };
  }

  const planName = !status.paywallEnabled ? "Development (paywall off)" : isPro ? PRO_PLAN.name : "No active plan";

  return (
    <>
      <SiteHeader isPro={isPro} />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-10 pb-12">
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>

        {params.error === "portal" && (
          <p role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            We couldn&apos;t open the billing portal. Please try again.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">Current plan</p>
          <p className="mt-1 text-2xl font-semibold" data-testid="plan-name">
            {planName}
          </p>
          {status.subscriptionStatus && (
            <p className="mt-1 text-sm text-zinc-400">
              Status: <span className="text-zinc-200">{status.subscriptionStatus.replace("_", " ")}</span>
              {status.cancelAt && isPro && (
                <> · access ends {new Date(status.cancelAt * 1000).toLocaleDateString("en-US", { dateStyle: "medium" })}</>
              )}
            </p>
          )}
          {isPro && <p className="mt-1 text-sm text-zinc-400">{PRO_PLAN.priceLabel} / month</p>}

          <div className="mt-5 flex flex-col gap-2">
            {isPro || !status.paywallEnabled ? (
              <Link
                href="/"
                className="rounded-xl bg-accent px-4 py-3 text-center font-semibold text-black hover:bg-accent-strong"
              >
                Start a workout
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="rounded-xl bg-accent px-4 py-3 text-center font-semibold text-black hover:bg-accent-strong"
              >
                Subscribe: {PRO_PLAN.priceLabel}/month
              </Link>
            )}
            {status.token && (
              <form action="/api/billing-portal" method="POST">
                <button type="submit" className="w-full rounded-xl bg-white/10 px-4 py-3 font-semibold hover:bg-white/15">
                  Manage billing
                </button>
              </form>
            )}
          </div>
        </div>

        {isPro && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5" aria-labelledby="devices-title">
            <h2 id="devices-title" className="text-lg font-semibold">
              Use on another device
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Subscribed on your laptop but want to train with your phone? Scan this code with the other device.
            </p>
            {deviceLink ? (
              <div className="mt-4 flex flex-col items-center gap-3">
                <div
                  className="w-56 overflow-hidden rounded-xl bg-white p-2"
                  role="img"
                  aria-label="QR code to link another device"
                  dangerouslySetInnerHTML={{ __html: deviceLink.qrSvg }}
                />
                <p className="text-xs text-zinc-400">
                  Valid for {LINK_TTL_SECONDS / 60} minutes. Only share it with your own devices.
                </p>
                <input
                  readOnly
                  value={deviceLink.url}
                  aria-label="Device link"
                  data-testid="device-link"
                  className="w-full truncate rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300"
                />
              </div>
            ) : (
              <Link
                href="/account?link=1"
                className="mt-4 block rounded-xl border border-white/15 px-4 py-3 text-center font-semibold hover:bg-white/5"
              >
                Show QR code
              </Link>
            )}
          </section>
        )}

        {status.paywallEnabled && (
          <p className="mt-4 text-xs text-zinc-400">
            Your subscription is saved in this browser. Use “Manage billing” to update your card, download invoices or
            cancel. Need help? Contact support with the email you used at checkout.
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
