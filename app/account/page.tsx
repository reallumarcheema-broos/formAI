import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PRO_PLAN } from "@/lib/billing/plans";
import { getProStatus, invalidateSubscriptionCache } from "@/lib/billing/subscription";
import { decodeProToken, PRO_COOKIE } from "@/lib/billing/token";
import { cookies } from "next/headers";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  if (params.refresh) {
    // Back from the Stripe portal: the plan may have changed.
    const token = decodeProToken((await cookies()).get(PRO_COOKIE)?.value);
    if (token) invalidateSubscriptionCache(token.subscriptionId);
  }
  const status = await getProStatus();
  const isPro = status.paywallEnabled && status.isPro;

  return (
    <>
      <SiteHeader isPro={isPro} />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-10 pb-12">
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>

        {params.welcome && isPro && (
          <p className="mt-6 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
            🎉 Welcome to {PRO_PLAN.name}! Every exercise is now unlocked on this device.
          </p>
        )}
        {params.error === "portal" && (
          <p role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            We couldn&apos;t open the billing portal. Please try again.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">Current plan</p>
          <p className="mt-1 text-2xl font-semibold">
            {!status.paywallEnabled ? "Development (all unlocked)" : isPro ? PRO_PLAN.name : "Free"}
          </p>
          {status.subscriptionStatus && (
            <p className="mt-1 text-sm text-zinc-400">
              Subscription status: <span className="text-zinc-200">{status.subscriptionStatus.replace("_", " ")}</span>
              {status.cancelAt && isPro && (
                <> · ends {new Date(status.cancelAt * 1000).toLocaleDateString("en-US", { dateStyle: "medium" })}</>
              )}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {status.token ? (
              <form action="/api/billing-portal" method="POST" className="flex-1">
                <button type="submit" className="w-full rounded-xl bg-white/10 px-4 py-3 font-semibold hover:bg-white/15">
                  Manage billing
                </button>
              </form>
            ) : null}
            {status.paywallEnabled && !isPro && (
              <Link
                href="/pricing"
                className="flex-1 rounded-xl bg-accent px-4 py-3 text-center font-semibold text-black hover:bg-accent-strong"
              >
                Upgrade — {PRO_PLAN.priceLabel}/mo
              </Link>
            )}
            <Link href="/" className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-center font-semibold hover:bg-white/5">
              Start a workout
            </Link>
          </div>
        </div>

        {status.paywallEnabled && (
          <p className="mt-4 text-xs text-zinc-500">
            Your subscription is linked to this browser. Use “Manage billing” to update your card, download invoices or
            cancel.
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
