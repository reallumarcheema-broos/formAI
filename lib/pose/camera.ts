/**
 * Camera helpers. Handles the iOS Safari quirks:
 *  - the <video> element must be `muted` + `playsInline` or it goes fullscreen / refuses to autoplay
 *  - getUserMedia requires HTTPS (or localhost)
 */

export type Facing = "user" | "environment";

export class CameraError extends Error {
  constructor(
    message: string,
    readonly reason: "unsupported" | "denied" | "not-found" | "in-use" | "unknown",
  ) {
    super(message);
  }
}

export async function startCamera(video: HTMLVideoElement, facing: Facing): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError(
      "Camera access isn't available. Make sure you're on HTTPS and using a modern browser.",
      "unsupported",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: facing,
        // Modest resolution: pose models downscale to 256px anyway, and smaller
        // frames keep phones cool and the frame rate high.
        width: { ideal: 720 },
        height: { ideal: 1280 },
        frameRate: { ideal: 30, max: 30 },
      },
    });
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      throw new CameraError("Camera permission was denied. Allow camera access in your browser settings.", "denied");
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      throw new CameraError("No camera was found on this device.", "not-found");
    }
    if (name === "NotReadableError") {
      throw new CameraError("The camera is being used by another app.", "in-use");
    }
    throw new CameraError("Couldn't start the camera.", "unknown");
  }

  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.srcObject = stream;

  await new Promise<void>((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) resolve();
    else video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
