import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LEGAL } from "@/lib/legal";

/** Shared layout for Terms / Privacy / Refunds: readable width, styled headings and lists. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-10 pb-16">
        <h1 className="font-display text-5xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {LEGAL.lastUpdated}</p>
        {!LEGAL.supportEmail && process.env.NODE_ENV !== "production" && (
          <p className="mt-4 rounded-xl border border-amber/50 bg-card p-3 text-sm text-amber-ink">
            Site owner: set <code>FORMAI_SUPPORT_EMAIL</code>, <code>FORMAI_BUSINESS_NAME</code> and{" "}
            <code>FORMAI_GOVERNING_LAW</code> so these pages show your real details. (This note only appears in
            development.)
          </p>
        )}
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-muted [&_a]:text-amber-ink [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-ink [&_ul]:space-y-2">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** A mailto link when an email is configured, plain text otherwise. */
export function ContactLink() {
  return LEGAL.supportEmail ? (
    <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
  ) : (
    <>the support email shown on your Stripe payment receipt</>
  );
}
