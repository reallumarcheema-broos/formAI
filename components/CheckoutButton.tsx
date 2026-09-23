import { PRO_PLAN } from "@/lib/billing/plans";

/** Posts to /api/checkout, which redirects to Stripe's hosted checkout. */
export function CheckoutButton({ exerciseId, label }: { exerciseId?: string; label?: string }) {
  return (
    <form action="/api/checkout" method="POST">
      {exerciseId && <input type="hidden" name="exercise" value={exerciseId} />}
      <button
        type="submit"
        className="w-full rounded-xl bg-accent px-5 py-4 text-lg font-bold text-black transition hover:bg-accent-strong active:scale-[0.99]"
      >
        {label ?? `Subscribe for ${PRO_PLAN.priceLabel}/month`}
      </button>
    </form>
  );
}
