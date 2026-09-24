# FormAI: AI form coach & camera calorie tracker

Prop up your phone or laptop, pick an exercise, and FormAI tracks your body through the camera. It counts reps, **estimates the calories you burn**, and **tells you out loud when your form is wrong**, during the set. Every workout feeds a **Progress** dashboard with daily calorie goals, streaks and a form score. **Everything runs in the browser, and no video is ever uploaded.**

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **MediaPipe Pose Landmarker** (`@mediapipe/tasks-vision`), running on-device via WebAssembly/WebGL
- **Web Speech API** for rep counts and form cues
- **Paid product:** every workout requires *FormAI Pro*, **$14.99/month (USD)**, billed through Stripe. After checkout, subscribers go straight into their workout.
- Mobile-first, built for Safari on iPhone and Chrome on Android.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The camera needs a **secure context**: `localhost` works, but to test on a phone you need HTTPS. Two easy options are `next dev --experimental-https` or a tunnel such as `ngrok http 3000`.

In `npm run dev` without Stripe keys the paywall is off, so you can work on pose tracking without Stripe. A banner on the home page reminds you. **In production the paywall is always on.** See [Subscription](#subscription-1499month-with-stripe).

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (copies the MediaPipe WASM into `public/` first) |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit tests: angle math, rep/form engine, signed tokens (Vitest) |
| `npm run test:e2e` | End-to-end tests in a real browser (Playwright). See [Testing](#testing). |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

Add `?debug=1` to a workout URL (e.g. `/workout/squat?debug=1`) to see live metrics and the rep phase on screen. That's the fastest way to tune thresholds on a real body.

## How it works

```
camera ──► PoseLandmarker ──► LandmarkSmoother ──► ExerciseEngine ──► HUD + VoiceCoach
 (getUserMedia)  (33 landmarks,      (5-frame, visibility-   (metrics → rep state        (rep counter, cues,
                  2D + 3D world)      weighted average)       machine → form rules)       skeleton highlight)
```

1. **Home** (`/`): pick Squat, Push-up or Lunge. Visitors are sent to pricing first.
2. **Setup** (`/workout/[exercise]`): placement tips plus a live check that turns green once the required joints have been visible for about half a second. The tips then collapse so the preview, especially your feet, isn't covered.
3. **Workout**: camera feed with a skeleton overlay, a big rep counter, a **live calorie counter**, on-screen and spoken form feedback, and Start / Pause / End controls. Joints involved in a form issue turn red.
4. **Summary**: total reps, **calories burned**, form score (good vs. flagged reps), partial reps and the most common form issue. The set is saved to the Progress page.
5. **Progress** (`/progress`): calories burned today vs. your daily goal, a 7-day chart, streak, form score, recent sets, and weight/goal settings.

### Calorie tracking

Calories are estimated with the standard ACSM formula, `kcal/min = MET × 3.5 × weight(kg) / 200`, using MET values from the Compendium of Physical Activities. Each exercise sets a light and a vigorous MET (`calories` in its definition). FormAI slides between the two based on your rep pace over the last 30 seconds, so a brisk set counts for more than a slow one. Calories only accumulate while you're tracked and in position, never while paused or out of frame. Users enter their weight on the setup screen (70 kg is used until they do). The code is in `lib/fitness/calories.ts`, with unit tests in `tests/calories.test.ts`.

Workout history, weight and daily goal are stored in the browser's `localStorage` only (`lib/fitness/history.ts`, `lib/fitness/profile.ts`), consistent with the "nothing leaves your device" promise. The Privacy Policy describes this.

### Folder structure

```
app/
  page.tsx                  Home + exercise picker
  progress/                 Calorie tracker dashboard
  pricing/ account/         Subscription pages (account also shows the device-link QR code)
  workout/[exercise]/       Workout route (server-side paywall check)
  api/checkout/             Stripe Checkout (+ /confirm callback)
  api/billing-portal/       Stripe customer portal
  api/device-link/          Unlock Pro on a second device
components/
  home/                     Landing-page hero illustration
  progress/                 ProgressDashboard, CaloriesChart
  workout/                  WorkoutFlow (setup → set → summary), CameraStage, usePoseTracking, SummaryView, WeightSetting
lib/
  pose/                     landmarks, angle math, smoothing, visibility checks, detector, camera, drawing
  exercises/                engine.ts (generic), types.ts, squat.ts, pushup.ts, lunge.ts, index.ts (registry)
  fitness/                  calorie estimates, workout history, weight/goal profile
  voice/                    VoiceCoach (cooldowns, iOS unlock), number words
  billing/                  plans, Stripe client, signed cookie, subscription status
tests/                      Vitest unit tests
e2e/                        Playwright end-to-end tests + mock Stripe server
```

## Adding a new exercise

Every exercise is a plain `ExerciseDefinition` object (see `lib/exercises/types.ts`). The engine, UI, voice and summary need no changes.

1. **Create `lib/exercises/<name>.ts`:**

   ```ts
   import { angleFromVertical, jointAngle } from "@/lib/pose/angles";
   import type { ExerciseDefinition } from "./types";

   export const glutebridge: ExerciseDefinition = {
     id: "glute-bridge",
     name: "Glute bridge",
     tagline: "Full hip extension",
     tier: "pro",                       // "free" or "pro"
     icon: "🍑",
     setup: { view: "side", instructions: ["Phone on the floor, side-on, 2 m away."] },
     requiredJoints: ["shoulder", "hip", "knee"],

     // Turn landmarks into named numbers. Use ctx.image(): aspect-corrected 2D
     // landmarks, near side by default. (Avoid ctx.world(): MediaPipe's 3D depth
     // is too noisy for thresholds.)
     computeMetrics: (ctx) => ({
       hip: jointAngle(ctx.image("shoulder"), ctx.image("hip"), ctx.image("knee")),
       torso: angleFromVertical(ctx.image("hip"), ctx.image("shoulder")),
     }),

     // Rep state machine with hysteresis: idle → below start → reach bottom → back past top = 1 rep.
     // Here the metric *increases* into the rep, so direction is "increasing".
     rep: { metric: "hip", direction: "increasing", topThreshold: 120, startThreshold: 135, bottomThreshold: 165 },

     // Calorie estimate: MET range (Compendium of Physical Activities) and the pace that counts as vigorous.
     calories: { metLight: 3.0, metVigorous: 5.0, vigorousRepsPerMin: 20 },

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
- Measure on real people with `?debug=1` before picking thresholds. In testing, MediaPipe's 3D world landmarks read a straight standing knee as about 140°, which is why all built-in exercises use 2D image geometry. Squat and lunge depth use `thighDepthAngle()`, which is correct from the front and from the side.
- Use `NaN` for metrics you can't measure from the current view (`ctx.view` is `"front"` or `"side"`). Rules comparing against `NaN` never fire.
- Use `inPosition` (see `pushup.ts`) to ignore frames where the person isn't set up. Push-ups only count while the body is horizontal.
- Keep a gap of 25° or more between `bottomThreshold` and `topThreshold` so jitter can't double count.
- Form cues are rate-limited to one per rule per rep on screen, and to once every 4 s per cue by voice.

## Subscription ($14.99/month with Stripe)

FormAI is paid: **every workout requires FormAI Pro at $14.99/month (USD)**. Visitors can browse the home and pricing pages. Opening any workout sends them to pricing.

The purchase flow needs no database:

1. A visitor taps an exercise (say Push-up) and lands on `/pricing?exercise=pushup`.
2. **Subscribe for $14.99/month** POSTs to `/api/checkout`, which creates a Stripe Checkout session in subscription mode and redirects to Stripe.
3. After payment, Stripe redirects to `/api/checkout/confirm`. The server **verifies the session with Stripe**, sets an httpOnly, HMAC-signed `formai_pro` cookie holding the customer and subscription IDs, and **drops the user straight into the Push-up workout**.
4. On each gated request the server checks the signature and asks Stripe whether the subscription is `active`, `trialing` or `past_due`. Results are cached in memory for 5 minutes. Cancellations take effect automatically, with no webhook needed.
5. **Manage billing** on `/account` opens the Stripe customer portal (update card, invoices, cancel).
6. **Use on another device**: `/account` shows a QR code, a signed link valid for 10 minutes. Scanning it on a phone unlocks Pro there too. This covers the common "paid on my laptop, train with my phone" case.

Safety rails (all covered by tests):
- **Fails closed.** In production the paywall is on even if Stripe keys are missing: nobody gets in and checkout shows "payments aren't set up".
- Existing subscribers can't start a second checkout.
- Forged or tampered cookies, canceled or unknown subscriptions, unpaid checkout sessions, and expired or forged device links are all rejected.
- The post-checkout redirect only accepts known exercise ids, so it can't be used as an open redirect.

### Set up Stripe

1. Create a Stripe account and copy your **secret key** (use `sk_test_…` while testing).
2. In the Stripe dashboard, enable the **Customer portal** (Settings → Billing → Customer portal) and allow cancellation.
3. Copy `.env.example` to `.env.local` and set:
   - `STRIPE_SECRET_KEY` (required)
   - `FORMAI_COOKIE_SECRET`: `openssl rand -base64 32` (recommended)
   - `NEXT_PUBLIC_SITE_URL`: your public URL (recommended, used for redirects and QR links)
   - `STRIPE_PRICE_ID`: optional. If you create a $14.99/month Price in the dashboard, set it here. Otherwise the price is created inline.
4. Test with card `4242 4242 4242 4242`, any future date and any CVC.
5. When you're ready for real money, switch to your live key (`sk_live_…`).

> **Limitation:** Pro lives in a browser cookie (plus any devices linked by QR). If someone clears their cookies on every device, they need support to recover access. Adding user accounts (e.g. Auth.js or Clerk) and storing the Stripe customer ID against the user would remove this limit.

### Legal pages

`/terms`, `/privacy` and `/refunds` are linked in every page footer and next to the Subscribe button, along with a clear auto-renewal notice. They describe what the app actually does: video stays on the device, Stripe handles payments, and there's one signed cookie. Fill in your details with environment variables, with no code changes:

| Variable | Example |
| --- | --- |
| `FORMAI_BUSINESS_NAME` | `Jane Smith Fitness LLC` |
| `FORMAI_SUPPORT_EMAIL` | `support@yourdomain.com` |
| `FORMAI_GOVERNING_LAW` | `the State of California, USA` |

The refund policy offers a **full refund within 7 days of the first payment**. Edit `app/refunds/page.tsx` if you want different terms. After changing any policy, update `lastUpdated` in `lib/legal.ts`.

> These pages are a solid, plain-English starting point, not legal advice. Have a lawyer review them for your country before you take real payments. In your Stripe dashboard, also set your public business details and support email (Settings → Public details), and the Terms and Privacy URLs.

## Testing

```bash
npm test            # 48 unit tests: angles, depth math, rep state machine, form rules, calories, history, signed tokens
npm run test:e2e    # 107 end-to-end tests (desktop Chrome + iPhone and Android viewports)
```

The e2e suite builds the app, starts it with `next start`, and points Stripe at **`e2e/mock-stripe.mjs`**, a local fake of the Stripe API with fake hosted Checkout and Billing Portal pages. That lets it test the whole paid flow offline:

- **Paywall:** visitors see $14.99/month, every workout is locked, and checkout sends `unit_amount=1499`, `usd`, `interval=month` in subscription mode.
- **Purchase:** subscribe, land in the chosen workout, all exercises unlocked, account shows Pro. No double charge. Canceling in the portal removes access. A past-due subscription keeps access.
- **Security:** forged, tampered or wrong-kind cookies, canceled or unknown subscriptions, unpaid sessions and made-up session ids are rejected. Security headers are set.
- **Device link:** QR link unlocks a fresh device. Expired, forged or canceled links are rejected.
- **Workout with the real pose model on real photos of people.** The camera is replaced with a canvas that shows a standing man and a man with his front knee bent like the bottom of a lunge (public MediaPipe test images, downloaded once into `e2e/.cache`). The tests check: the setup check turns green, the skeleton is drawn, standing still never counts, a real lunge counts and is spoken ("One", "Two"), pause/resume, mute is remembered, the out-of-frame warning, camera switching, a denied camera, and the summary.
- **Calories & progress:** live calorie counter, calories on the summary, sets saved and shown on the Progress page, weight and goal settings with validation, 7-day chart tooltip, streak and form score, clearing history.
- **Every page:** no console errors, no sideways scrolling on phones, and no serious or critical accessibility (axe) violations, including the Progress chart and the workout screen.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit and e2e tests on every push.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New → Project**, then import the repo. The framework is auto-detected as Next.js, so there's nothing to configure.
3. Under **Settings → Environment Variables**, add `STRIPE_SECRET_KEY`, `FORMAI_COOKIE_SECRET`, `NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app`, and your business details (`FORMAI_BUSINESS_NAME`, `FORMAI_SUPPORT_EMAIL`, `FORMAI_GOVERNING_LAW`). Without the Stripe key the site still deploys, but every workout stays locked and checkout reports that payments aren't set up.
4. Deploy. Vercel serves over HTTPS, so the camera works on phones right away.

Or use the CLI: `npm i -g vercel && vercel --prod`.

The MediaPipe WASM runtime (~12 MB) is copied from `node_modules` into `public/mediapipe/` at build time and served from your own domain. The pose model (~6 MB, `pose_landmarker_lite`) loads from Google's model bucket. To self-host it, download it into `public/` and set `NEXT_PUBLIC_POSE_MODEL_URL`. Browsers cache both files after the first visit.

## Privacy

Camera frames are processed locally by MediaPipe in WebAssembly/WebGL. No frames, landmarks or workout data are sent to any server. Workout history, weight and calorie goal stay in the browser's local storage. The only network calls are downloading the model/runtime and the subscription check against Stripe.

## Browser notes

- **iOS Safari:** the `<video>` is `muted` and `playsInline`. Speech is "unlocked" by the Start tap, because iOS only allows speech after a user gesture. The GPU delegate falls back to CPU automatically where WebGL features are missing.
- **Screen wake lock** keeps the phone awake during a set where supported.
- The front camera is mirrored. Use 🔄 to switch to the rear camera.
