import Link from "next/link";
import { LogoMark } from "./icons";

export function SiteFooter() {
  return (
    <footer className="safe-bottom mt-auto bg-espresso px-4 pt-12 text-cream sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-xl font-semibold tracking-[0.12em]">FormAI</span>
          </div>
          <p className="mt-3 text-sm text-muted-dark">
            Your AI form coach and calorie tracker. Workout video is processed on your device and never uploaded.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <nav aria-label="Product" className="flex flex-col gap-2">
            <p className="eyebrow text-amber">Product</p>
            <Link href="/#features" className="text-muted-dark hover:text-cream">Features</Link>
            <Link href="/food" className="text-muted-dark hover:text-cream">Food scanner</Link>
            <Link href="/progress" className="text-muted-dark hover:text-cream">Progress</Link>
            <Link href="/pricing" className="text-muted-dark hover:text-cream">Pricing</Link>
          </nav>
          <nav aria-label="Legal" className="flex flex-col gap-2">
            <p className="eyebrow text-amber">Legal</p>
            <Link href="/terms" className="text-muted-dark hover:text-cream">Terms of Service</Link>
            <Link href="/privacy" className="text-muted-dark hover:text-cream">Privacy Policy</Link>
            <Link href="/refunds" className="text-muted-dark hover:text-cream">Refund Policy</Link>
          </nav>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-white/10 py-6 text-xs text-muted-dark">
        FormAI gives general coaching cues and calorie estimates. It is not medical advice. Train within your limits.
      </p>
    </footer>
  );
}
