import type { Metadata } from "next";
import { ContactLink, LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How FormAI handles your data. Your camera video never leaves your device.",
};

export default function PrivacyPage() {
  const b = LEGAL.businessName;
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what information {b} (&ldquo;we&rdquo;) handles when you use FormAI, and why. In short:{" "}
        <strong>your camera video never leaves your device</strong>, we don&apos;t run ads or analytics, and we never
        sell your data.
      </p>

      <h2>1. Your camera and body data stays on your device</h2>
      <ul>
        <li>
          FormAI analyses your camera feed <strong>entirely inside your browser</strong> using on-device machine
          learning. Video frames, images and body-position data are <strong>never recorded, stored or sent</strong> to
          us or anyone else.
        </li>
        <li>Rep counts, calorie estimates and workout summaries are never saved on our servers.</li>
        <li>You can deny or revoke camera permission at any time in your browser settings.</li>
      </ul>

      <h2>2. Information we do handle</h2>
      <ul>
        <li>
          <strong>Payment and billing details.</strong> When you subscribe, Stripe collects your email address, payment
          card and billing details. We never receive your full card number. We can see your email, the last four digits
          of your card, your billing country and your subscription status in our Stripe account so we can provide
          support and manage your subscription.
        </li>
        <li>
          <strong>A subscription cookie.</strong> After you subscribe, we store one cookie (<code>formai_pro</code>)
          in your browser. It contains your Stripe customer and subscription identifiers, signed so it can&apos;t be
          forged. It lasts up to 400 days and is only used to unlock workouts on that device.
        </li>
        <li>
          <strong>Workout history and calorie settings.</strong> Your finished sets (exercise, reps, form results,
          estimated calories, date), the body weight and daily calorie goal you enter, and whether you muted the voice
          coach are saved in your browser&apos;s local storage (<code>formai:history</code>,{" "}
          <code>formai:profile</code>, <code>formai:muted</code>). They power the Progress page, <strong>never leave
          your device</strong>, and aren&apos;t visible to us. You can delete your history from the Progress page or by
          clearing your browser data.
        </li>
        <li>
          <strong>Server logs.</strong> Like any website, our hosting provider automatically records technical request
          data such as IP address, browser type and pages requested, for security and reliability. These logs are kept
          for a short period.
        </li>
        <li>
          <strong>Support emails.</strong> If you email us, we keep the conversation to help you.
        </li>
      </ul>

      <h2>3. Why we use it</h2>
      <ul>
        <li>to provide FormAI and unlock workouts for paying subscribers (performing our contract with you);</li>
        <li>to process payments, prevent fraud and meet tax and accounting obligations (legal obligation);</li>
        <li>to keep the service secure and working (legitimate interests);</li>
        <li>to answer your questions.</li>
      </ul>
      <p>We don&apos;t use your information for advertising, and we don&apos;t sell or rent it to anyone.</p>

      <h2>4. Who we share it with</h2>
      <ul>
        <li>
          <strong>Stripe</strong>, which processes payments and manages subscriptions (see stripe.com/privacy).
        </li>
        <li>
          <strong>Vercel</strong>, which hosts this website and processes server logs.
        </li>
        <li>
          <strong>Google</strong>: when a workout starts, your browser downloads the pose-detection model file from
          Google&apos;s servers, so Google receives your IP address and browser details for that download, as with any
          file download. No camera data is sent.
        </li>
        <li>Authorities, if the law requires it.</li>
      </ul>
      <p>
        These providers may process data outside your country, including in the United States, with appropriate
        safeguards such as standard contractual clauses.
      </p>

      <h2>5. How long we keep it</h2>
      <p>
        Billing records are kept as long as tax and accounting law requires (usually up to 7 years). The subscription
        cookie stays in your browser until it expires or you clear it. Support emails are kept while needed to help
        you and then deleted.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live (for example under the GDPR in the EU/UK or the CCPA in California), you may have
        the right to access, correct, delete or export your personal information, to object to or restrict how we use
        it, and to complain to your local data protection authority. To make a request, email <ContactLink />. We
        won&apos;t treat you differently for exercising your rights.
      </p>
      <p>
        You can remove the subscription cookie at any time by clearing your browser&apos;s cookies for this site.
      </p>

      <h2>7. Children</h2>
      <p>
        FormAI isn&apos;t directed at children under 13, and we don&apos;t knowingly collect information from them. If
        you believe a child has given us information, contact us and we&apos;ll delete it.
      </p>

      <h2>8. Security</h2>
      <p>
        We use HTTPS everywhere, sign our cookies, and rely on Stripe&apos;s PCI-compliant systems for payments. No
        method is 100% secure, but we keep what we hold to a minimum.
      </p>

      <h2>9. Changes</h2>
      <p>
        We&apos;ll update the date at the top when this policy changes and tell subscribers about significant changes.
      </p>

      <h2>10. Contact</h2>
      <p>
        {b}: <ContactLink />
      </p>
    </LegalPage>
  );
}
