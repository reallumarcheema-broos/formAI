/** Plan details shared by the pricing UI and the Stripe checkout route. */
export const PRO_PLAN = {
  name: "FormAI Pro",
  priceCents: 1499,
  currency: "usd",
  interval: "month",
  /** Display string. Keep in sync with priceCents. */
  priceLabel: "$14.99",
  features: [
    "Every exercise: Squats, Push-ups, Lunges, plus new ones as they ship",
    "Real-time form check: spoken cues the moment your form slips",
    "AI camera calorie tracker with daily goals and streaks",
    "Live skeleton tracking with rep counting",
    "Summary after every set: good vs. flagged reps, top form issue",
    "Use it on your phone and laptop",
    "100% on-device: your video never leaves your device",
    "Cancel anytime from your account page",
  ],
} as const;
