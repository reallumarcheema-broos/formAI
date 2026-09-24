import { PRO_PLAN } from "@/lib/billing/plans";

/** Posts to /api/checkout, which redirects to Stripe's hosted checkout. */
export function CheckoutButton({ exerciseId, label }: { exerciseId?: string; label?: string }) {
  return (
    <form action="/api/checkout" method="POST">
      {exerciseId && <input type="hidden" name="exercise" value={exerciseId} />}
      <button
        type="submit"
        className="w-full rounded-full bg-cream px-5 py-4 text-lg font-semibold text-ink transition hover:bg-white active:scale-[0.99]"
      >
        {label ?? `Subscribe for ${PRO_PLAN.priceLabel}/month`}
      </button>
    </form>
  );
}
