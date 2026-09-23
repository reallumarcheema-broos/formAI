# FormAI: real-time AI workout form coach

Prop up your phone or laptop, pick an exercise, and FormAI tracks your body through the camera. It counts reps, spots bad form, and speaks cues to you during the set. **Everything runs in the browser, and no video is ever uploaded.**

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **MediaPipe Pose Landmarker** (`@mediapipe/tasks-vision`), running on-device via WebAssembly/WebGL
- **Web Speech API** for rep counts and form cues
- **Stripe** subscription: *FormAI Pro*, **$14.99/month**
- Mobile-first. Tested layouts for Safari on iPhone and Chrome on Android.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The camera needs a **secure context**: `localhost` works, but to test on a phone you need HTTPS. Two easy options are `next dev --experimental-https` or a tunnel such as `ngrok http 3000`.

With no Stripe keys configured, the paywall is off and every exercise is unlocked. That makes local development painless.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (copies the MediaPipe WASM into `public/` first) |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit tests for angle math and the rep/form engine (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## How it works

```
camera ──► PoseLandmarker ──► LandmarkSmoother ──► ExerciseEngine ──► HUD + VoiceCoach
 (getUserMedia)  (33 landmarks,      (5-frame, visibility-   (metrics → rep state        (rep counter, cues,
                  2D + 3D world)      weighted average)       machine → form rules)       skeleton highlight)
```

1. **Home** (`/`): pick Squat, Push-up or Lunge.
2. **Setup** (`/workout/[exercise]`): placement instructions plus a live check that turns green once the required joints have been visible for about half a second.
3. **Workout**: camera feed with a skeleton overlay, a big rep counter, on-screen and spoken feedback, and Start / Pause / End controls. Joints involved in a form issue turn red.
4. **Summary**: total reps, good-form vs. flagged reps, partial reps and the most common form issue.

### Folder structure

```
app/
  page.tsx                  Home + exercise picker
  pricing/ account/         Subscription pages
  workout/[exercise]/       Workout route (server-side paywall check)
  api/checkout/             Stripe Checkout (+ /confirm callback)
  api/billing-portal/       Stripe customer portal
components/
  workout/                  WorkoutFlow (setup → set → summary), CameraStage, usePoseTracking, SummaryView
lib/
  pose/                     landmarks, angle math, smoothing, visibility checks, detector, camera, drawing
  exercises/                engine.ts (generic), types.ts, squat.ts, pushup.ts, lunge.ts, index.ts (registry)
  voice/                    VoiceCoach (cooldowns, iOS unlock), number words
  billing/                  plans, Stripe client, signed cookie, subscription status
tests/                      Vitest specs
```

## Adding a new exercise

Every exercise is a plain `ExerciseDefinition` object (see `lib/exercises/types.ts`). The engine, UI, voice and summary need no changes.

1. **Create `lib/exercises/<name>.ts`:**

   ```ts
   import { jointAngle } from "@/lib/pose/angles";
   import type { ExerciseDefinition } from "./types";

   export const glutebridge: ExerciseDefinition = {
     id: "glute-bridge",
     name: "Glute bridge",
     tagline: "Full hip extension",
     tier: "pro",                       // "free" or "pro"
     icon: "🍑",
     setup: { view: "side", instructions: ["Phone on the floor, side-on, 2 m away."] },
     requiredJoints: ["shoulder", "hip", "knee"],

     // Turn landmarks into named numbers. world() = 3D meters (best for joint angles),
     // image() = aspect-corrected 2D (best for lean/alignment). Near side by default.
     computeMetrics: (ctx) => ({
       hip: jointAngle(ctx.world("shoulder"), ctx.world("hip"), ctx.world("knee")),
     }),

     // Rep state machine with hysteresis: idle → below start → reach bottom → back past top = 1 rep.
     // Here the metric *increases* into the rep, so direction is "increasing".
     rep: { metric: "hip", direction: "increasing", topThreshold: 120, startThreshold: 135, bottomThreshold: 165 },

     rules: [
       // Checked once per rep, on min/max over the rep.
       { id: "bridge-lockout", type: "rep", message: "Squeeze to full hip extension",
         checkPartial: true, isViolated: ({ max }) => max.hip < 170 },
       // Checked every frame mid-rep; must persist for minFrames to fire.
       // { id: "...", type: "frame", phases: ["moving", "bottom"], minFrames: 6, message: "...", isViolated: (m) => ... },
     ],
   };
   ```

2. **Register it** in `lib/exercises/index.ts` by adding it to `EXERCISES`.
3. **Add a test** next to `tests/squat.test.ts` that feeds synthetic poses through `ExerciseEngine`.

Tips:
- Use `NaN` for metrics you can't measure from the current view (`ctx.view` is `"front"` or `"side"`). Rules comparing against `NaN` never fire.
- Use `inPosition` (see `pushup.ts`) to ignore frames where the person isn't set up. Push-ups only count while the body is horizontal.
- Keep a gap of 25° or more between `bottomThreshold` and `topThreshold` so jitter can't double count.
- Form cues are rate-limited to one per rule per rep on screen, and to once every 4 s per cue by voice.

## Subscription ($14.99/month with Stripe)

| Plan | Price | Includes |
| --- | --- | --- |
| Free | $0 | Squat, rep counting, voice cues, summaries |
| **FormAI Pro** | **$14.99 / month** | Every exercise (Push-up, Lunge, and future ones) |

How it works, with no database needed:

1. The **Get Pro** button POSTs to `/api/checkout`, which creates a Stripe Checkout session in subscription mode and redirects to Stripe.
2. After payment, Stripe redirects to `/api/checkout/confirm?session_id=…`. The server **verifies the session with Stripe**, then sets an httpOnly, HMAC-signed `formai_pro` cookie holding the customer and subscription IDs.
3. On each gated request, the server checks the signature and asks Stripe whether the subscription is `active`, `trialing` or `past_due`. Results are cached in memory for 5 minutes. Cancellations therefore take effect automatically, with no webhook needed.
4. **Manage billing** on `/account` opens the Stripe customer portal (update card, invoices, cancel).

### Set up Stripe

1. Create a Stripe account and copy your **secret key** (use `sk_test_…` while testing).
2. In the Stripe dashboard, enable the **Customer portal** (Settings → Billing → Customer portal) and allow cancellation.
3. Copy `.env.example` to `.env.local` and set `STRIPE_SECRET_KEY`. Optionally set:
   - `STRIPE_PRICE_ID`: a recurring $14.99/month Price you created. If omitted, the price is created inline at checkout.
   - `FORMAI_COOKIE_SECRET`: a dedicated cookie-signing secret (`openssl rand -base64 32`).
   - `NEXT_PUBLIC_SITE_URL`: your public URL, used for Stripe redirects.
4. Test with card `4242 4242 4242 4242`, any future date and any CVC.

> **Limitation:** Pro is linked to the browser that completed checkout. To support multiple devices or restore purchases, add user accounts (e.g. Auth.js or Clerk) and store the Stripe customer ID against the user. Before charging real customers, also add Terms of Service and Privacy Policy pages.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New → Project**, then import the repo. The framework is auto-detected as Next.js, so there's nothing to configure.
3. Under **Settings → Environment Variables**, add `STRIPE_SECRET_KEY` and the optional variables above (`NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app`).
4. Deploy. Vercel serves over HTTPS, so the camera works on phones right away.

Or use the CLI: `npm i -g vercel && vercel --prod`.

The MediaPipe WASM runtime (~12 MB) is copied from `node_modules` into `public/mediapipe/` at build time and served from your own domain. The pose model (~6 MB, `pose_landmarker_lite`) loads from Google's model bucket. To self-host it, download it into `public/` and set `NEXT_PUBLIC_POSE_MODEL_URL`. Browsers cache both files after the first visit.

## Privacy

Camera frames are processed locally by MediaPipe in WebAssembly/WebGL. No frames, landmarks or workout data are sent to any server. The only network calls are downloading the model/runtime and, if you subscribe, Stripe checkout.

## Browser notes

- **iOS Safari:** the `<video>` is `muted` and `playsInline`. Speech is "unlocked" by the Start tap, because iOS only allows speech after a user gesture. The GPU delegate falls back to CPU automatically where WebGL features are missing.
- **Screen wake lock** keeps the phone awake during a set where supported.
- The front camera is mirrored. Use 🔄 to switch to the rear camera.
