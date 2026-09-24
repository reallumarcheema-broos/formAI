import { PRO_PLAN } from "@/lib/billing/plans";

/**
 * Business details shown on the Terms, Privacy and Refund pages.
 * Set these as environment variables (see .env.example) — no code changes needed.
 */
export const LEGAL = {
  /** Legal name of the person or company selling FormAI Pro. */
  businessName: process.env.FORMAI_BUSINESS_NAME || "FormAI",
  /** Where customers send support, refund and privacy requests. */
  supportEmail: process.env.FORMAI_SUPPORT_EMAIL || "",
  /** e.g. "the State of California, USA". */
  governingLaw: process.env.FORMAI_GOVERNING_LAW || "",
  /** Bump this whenever the policies change. */
  lastUpdated: "September 24, 2026",
  price: `${PRO_PLAN.priceLabel} USD per month`,
};
