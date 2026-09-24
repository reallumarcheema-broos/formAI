import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-display text-8xl font-bold text-amber-ink">404</p>
        <h1 className="font-display mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted">That page doesn&apos;t exist. Let&apos;s get you back to training.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-espresso px-6 py-3 font-semibold text-cream hover:bg-espresso-2"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
