import Link from "next/link";
import { LogoMark } from "./icons";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/food", label: "Food log" },
  { href: "/progress", label: "Progress" },
  { href: "/pricing", label: "Pricing" },
  { href: "/account", label: "Account" },
];

export function SiteHeader({ isPro = false }: { isPro?: boolean }) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pb-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="FormAI home">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-xl font-semibold tracking-[0.12em]">FormAI</span>
          {isPro && (
            <span className="rounded-full bg-espresso px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-bright">
              PRO
            </span>
          )}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-ink/80 hover:bg-sand hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={isPro ? "/#exercises" : "/pricing"}
            className="rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-cream transition hover:bg-espresso-2"
          >
            {isPro ? "Start workout" : "Get started"}
          </Link>
          {/* Mobile menu: a native disclosure, no JavaScript needed. */}
          <details className="relative md:hidden">
            <summary
              aria-label="Menu"
              className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full border border-line [&::-webkit-details-marker]:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 mt-2 flex w-48 flex-col rounded-2xl border border-line bg-card p-2 shadow-xl"
            >
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2.5 text-sm hover:bg-sand">
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
