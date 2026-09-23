import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { FIXTURES, fixturePath, CACHE_DIR } from "./helpers/fixtures";

/**
 * Download the pose model and two real photos (from Google's public MediaPipe
 * test assets) once, so camera tests can run the real model on real people.
 * Cached in e2e/.cache (git-ignored). If offline, the real-model tests skip.
 */
export default async function globalSetup() {
  mkdirSync(CACHE_DIR, { recursive: true });
  for (const [name, url] of Object.entries(FIXTURES)) {
    const file = fixturePath(name as keyof typeof FIXTURES);
    if (existsSync(file)) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      console.log(`[e2e] downloaded ${name}`);
    } catch (err) {
      console.warn(`[e2e] could not download ${name} (${url}): ${String(err)}; real-model tests will be skipped`);
    }
  }
}
