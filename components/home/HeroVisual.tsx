import { CheckIcon, FlameIcon, SparkIcon } from "@/components/icons";

/** Joint positions for the illustrated athlete (a forward lunge, facing right). */
const J = {
  head: [212, 150],
  shoulder: [205, 210],
  elbow: [176, 262],
  hand: [204, 304],
  farElbow: [262, 226],
  farHand: [318, 214],
  hip: [195, 318],
  frontKnee: [288, 322],
  frontAnkle: [292, 438],
  frontToe: [334, 450],
  backKnee: [140, 428],
  backAnkle: [72, 420],
  backToe: [56, 450],
} as const;

type P = readonly [number, number];
const seg = (a: P, b: P) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;

/**
 * Hero illustration: a stylised athlete with the live pose skeleton FormAI
 * draws, plus floating cards showing the three things the app tracks:
 * calories, reps and form.
 */
export function HeroVisual() {
  const body = "#2a211c";
  const far = "#4b3c32";
  const bones: [P, P][] = [
    [J.shoulder, J.hip],
    [J.shoulder, J.elbow],
    [J.elbow, J.hand],
    [J.hip, J.frontKnee],
    [J.frontKnee, J.frontAnkle],
    [J.hip, J.backKnee],
    [J.backKnee, J.backAnkle],
  ];
  const joints: P[] = [J.shoulder, J.elbow, J.hand, J.hip, J.frontKnee, J.frontAnkle, J.backKnee, J.backAnkle];

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="relative aspect-[4/5] w-full">
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-[radial-gradient(120%_90%_at_70%_20%,#f7efe4_0%,#e6d8c6_45%,#cfbba3_100%)] shadow-[0_30px_80px_-30px_rgba(28,22,19,0.45)]">
          {/* Soft floor and window light */}
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#bfa98f]/60 to-transparent" />
          <div className="absolute -top-10 right-6 h-72 w-40 rotate-12 bg-white/25 blur-2xl" />

          <svg
            viewBox="0 0 400 500"
            className="absolute inset-x-0 bottom-0 h-[92%] w-full"
            role="img"
            aria-label="Illustration of an athlete in a lunge with FormAI's pose-tracking skeleton overlaid"
          >
            {/* Mat and shadow */}
            <rect x="24" y="452" width="352" height="12" rx="6" fill="#b9a38a" />
            <ellipse cx="196" cy="452" rx="150" ry="7" fill="#1c1613" opacity="0.18" />

            {/* Far arm, reaching forward for balance */}
            <g stroke={far} strokeLinecap="round" fill="none">
              <path d={seg(J.shoulder, J.farElbow)} strokeWidth="21" />
              <path d={seg(J.farElbow, J.farHand)} strokeWidth="17" />
            </g>

            {/* Back leg */}
            <g stroke={body} strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d={seg(J.hip, J.backKnee)} strokeWidth="40" />
              <path d={seg(J.backKnee, J.backAnkle)} strokeWidth="30" />
              <path d={seg(J.backAnkle, J.backToe)} strokeWidth="16" />
            </g>

            {/* Torso, neck and head */}
            <path
              d="M180 204 C196 190 222 192 232 206 C238 240 232 276 224 302 C222 318 222 330 214 338 C196 346 176 344 168 330 C172 300 178 270 176 238 C175 222 175 212 180 204 Z"
              fill={body}
            />
            <path d={seg([206, 198], [210, 170])} stroke={body} strokeWidth="18" strokeLinecap="round" />
            <circle cx={J.head[0]} cy={J.head[1]} r="24" fill={body} />
            <circle cx="190" cy="134" r="11" fill={body} />

            {/* Front leg */}
            <g stroke={body} strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d={seg(J.hip, J.frontKnee)} strokeWidth="42" />
              <path d={seg(J.frontKnee, J.frontAnkle)} strokeWidth="32" />
              <path d={seg([284, 450], J.frontToe)} strokeWidth="14" />
            </g>

            {/* Near arm, hand on hip */}
            <g stroke={body} strokeLinecap="round" fill="none">
              <path d={seg(J.shoulder, J.elbow)} strokeWidth="22" />
              <path d={seg(J.elbow, J.hand)} strokeWidth="18" />
            </g>

            {/* FormAI pose skeleton */}
            <g stroke="#fbf8f4" strokeWidth="2" strokeLinecap="round" opacity="0.9">
              {bones.map(([a, b], i) => (
                <path key={i} d={seg(a, b)} />
              ))}
            </g>
            {joints.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="8" fill="#e0a158" opacity="0.35" />
                <circle cx={x} cy={y} r="5" fill="#fbf8f4" stroke="#c7822f" strokeWidth="2.5" />
              </g>
            ))}

            {/* Knee angle readout */}
            <path d="M268 322 A20 20 0 0 1 288 342" stroke="#e0a158" strokeWidth="2.5" fill="none" />
            <g transform="translate(300 292)">
              <rect width="46" height="24" rx="12" fill="#1c1613" />
              <text x="23" y="16.5" textAnchor="middle" fontSize="12" fontWeight="600" fill="#f4eee6">
                91°
              </text>
            </g>
          </svg>
        </div>

        {/* Floating stat cards */}
        <div className="animate-float absolute -right-2 top-6 w-40 rounded-2xl border border-white/60 bg-card/90 p-4 shadow-xl backdrop-blur sm:-right-6 sm:w-44">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted">
            <FlameIcon className="h-4 w-4 text-amber-ink" /> CALORIES
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-display text-4xl font-semibold leading-none">
              184
              <span className="ml-1 text-sm font-medium text-muted normal-case">kcal</span>
            </p>
            <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15" stroke="#dccdbb" strokeWidth="4" fill="none" />
              <circle
                cx="18"
                cy="18"
                r="15"
                stroke="#c7822f"
                strokeWidth="4"
                fill="none"
                strokeDasharray="94.2"
                strokeDashoffset="36"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="mt-2 text-[11px] text-muted">61% of today&apos;s goal</p>
        </div>

        <div
          className="animate-float absolute -left-3 top-8 w-28 rounded-2xl bg-espresso p-4 text-cream shadow-xl sm:-left-8 sm:w-32"
          style={{ animationDelay: "-2s" }}
        >
          <p className="text-xs font-semibold tracking-wide text-muted-dark">REPS</p>
          <p className="font-display text-5xl font-semibold leading-none">12</p>
          <p className="mt-1 text-[11px] leading-tight text-amber-bright">11 with good form</p>
        </div>
      </div>

      {/* On phones this card sits below the picture so it never hides the body. */}
      <div
        className="animate-float mx-6 mt-5 rounded-2xl border border-white/60 bg-card/95 p-3.5 shadow-xl backdrop-blur sm:absolute sm:-left-10 sm:top-[38%] sm:mx-0 sm:mt-0 sm:w-52 sm:p-4"
        style={{ animationDelay: "-4s" }}
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink">
          <SparkIcon className="h-4 w-4 text-amber-ink" /> AI FORM CHECK
        </p>
        <p className="mt-2 text-sm leading-snug text-ink">Keep your chest up and push your knees out.</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
          <CheckIcon className="h-4 w-4" /> Depth looks great
        </p>
      </div>
    </div>
  );
}
