import Link from "next/link";

export function SiteHeader({ isPro = false }: { isPro?: boolean }) {
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-white/5 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-black text-black">F</span>
          FormAI
          {isPro && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">PRO</span>
          )}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/pricing" className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white">
            Pricing
          </Link>
          <Link href="/account" className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white">
            Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
