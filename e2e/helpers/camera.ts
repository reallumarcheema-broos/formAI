import type { Page } from "@playwright/test";
import { fixturePath } from "./fixtures";

export type Scene = "empty" | "standing" | "warrior";

/**
 * Replace the real camera with a canvas stream that shows real photos, and
 * record everything the voice coach says in `window.__spoken`.
 * The pose model is served from the local cache so tests don't depend on the network.
 */
export async function installFakeCamera(page: Page, opts: { deny?: boolean } = {}) {
  await page.route("**/pose_landmarker_lite.task", (route) =>
    route.fulfill({ path: fixturePath("model"), contentType: "application/octet-stream" }),
  );
  await page.route("**/__fixtures/*.jpg", (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!.replace(".jpg", "");
    return route.fulfill({ path: fixturePath(name as "standing" | "warrior"), contentType: "image/jpeg" });
  });

  await page.addInitScript(
    ({ deny }) => {
      const w = window as unknown as Record<string, unknown>;
      w.__spoken = [] as string[];
      const fakeSynth = {
        speaking: false,
        pending: false,
        paused: false,
        speak: (u: SpeechSynthesisUtterance) => (w.__spoken as string[]).push(u.text),
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      Object.defineProperty(window, "speechSynthesis", { value: fakeSynth, configurable: true });

      w.__scene = "empty";
      w.__getUserMediaCalls = 0;
      const images: Record<string, HTMLImageElement> = {};
      w.__setScene = (scene: string) => {
        if (scene !== "empty" && !images[scene]) {
          const img = new Image();
          img.src = `/__fixtures/${scene}.jpg`;
          images[scene] = img;
        }
        w.__scene = scene;
      };

      navigator.mediaDevices.getUserMedia = async () => {
        w.__getUserMediaCalls = (w.__getUserMediaCalls as number) + 1;
        if (deny) throw new DOMException("Permission denied", "NotAllowedError");
        const canvas = document.createElement("canvas");
        canvas.width = 960;
        canvas.height = 960;
        const ctx = canvas.getContext("2d")!;
        const draw = () => {
          ctx.fillStyle = "#6b7280";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const img = images[w.__scene as string];
          if (w.__scene !== "empty" && img?.complete && img.naturalWidth) {
            // Letterbox the photo into the frame.
            const s = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
            const dw = img.naturalWidth * s;
            const dh = img.naturalHeight * s;
            ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
          }
        };
        setInterval(draw, 33);
        draw();
        return canvas.captureStream(30);
      };
    },
    { deny: opts.deny ?? false },
  );
}

export async function setScene(page: Page, scene: Scene) {
  await page.evaluate((s) => (window as unknown as { __setScene: (s: string) => void }).__setScene(s), scene);
}

export async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
}
