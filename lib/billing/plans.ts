/** Plan details shared by the pricing UI and the Stripe checkout route. */
export const PRO_PLAN = {
  name: "FormAI Pro",
  priceCents: 1499,
  currency: "usd",
  interval: "month",
  /** Display string. Keep in sync with priceCents. */
  priceLabel: "$14.99",
  features: [
    "Every exercise: Push-ups, Lunges and all new ones as they ship",
    "Real-time form cues with voice coaching",
    "Rep counting with good-form vs. flagged breakdown",
    "Cancel anytime from your account page",
  ],
} as const;

export const FREE_PLAN = {
  name: "Free",
  features: [
    "Squat coaching with live skeleton overlay",
    "Rep counting and spoken form cues",
    "Workout summary after every set",
    "100% on-device — video never leaves your phone",
  ],
} as const;
