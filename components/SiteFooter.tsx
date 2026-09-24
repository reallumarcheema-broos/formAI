import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="safe-bottom mt-auto border-t border-white/5 px-4 pt-6 text-center text-xs text-zinc-400">
      <nav aria-label="Legal" className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
        <Link href="/terms" className="hover:text-white">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:text-white">
          Privacy Policy
        </Link>
        <Link href="/refunds" className="hover:text-white">
          Refund Policy
        </Link>
      </nav>
      <p>Pose tracking runs on your device. No video is recorded or uploaded.</p>
      <p className="mt-1">FormAI gives general coaching cues and is not medical advice. Train within your limits.</p>
    </footer>
  );
}
