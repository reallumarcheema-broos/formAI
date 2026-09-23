import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-black text-accent">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-zinc-400">That page doesn&apos;t exist. Let&apos;s get you back to training.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-accent px-5 py-3 font-semibold text-black hover:bg-accent-strong"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
