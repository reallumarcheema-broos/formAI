import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using FormAI and the FormAI Pro subscription.",
};

export default function TermsPage() {
  const b = LEGAL.businessName;
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are an agreement between you and {b} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for your use of FormAI,
        a browser-based workout form coach, and the FormAI Pro subscription. By using FormAI or subscribing, you agree
        to these terms. If you don&apos;t agree, please don&apos;t use the service.
      </p>

      <h2>1. What FormAI does</h2>
      <p>
        FormAI uses your device&apos;s camera and on-device machine learning to track your body, count repetitions,
        estimate calories burned and give spoken and on-screen form cues. Workout video is processed in your browser and is never uploaded to us. The optional food scanner sends photos you choose to our AI provider to estimate their nutrition. See
        our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>2. Health and safety</h2>
      <ul>
        <li>
          <strong>FormAI is not medical advice</strong> and is not a substitute for a doctor, physiotherapist or
          qualified coach. Talk to a medical professional before starting any exercise program, especially if you
          have an injury, a medical condition, or are pregnant.
        </li>
        <li>
          Form cues are generated automatically and <strong>can be wrong or missed</strong>. Camera angle, lighting,
          clothing and body type all affect accuracy. Use your own judgement.
        </li>
        <li>
          <strong>Calorie numbers are estimates</strong>, based on your body weight, the exercise and your pace. Actual
          energy use varies from person to person. Don&apos;t rely on them for medical or dietary decisions.
        </li>
        <li>
          <strong>Food scans are estimates too.</strong> AI can misidentify foods, portions, oils and ingredients. Never
          rely on FormAI for allergies, diabetes or any medical diet; check labels and ask a professional.
        </li>
        <li>Stop immediately if you feel pain, dizziness or shortness of breath.</li>
        <li>
          Exercise in a safe, clear space and place your device securely. You are responsible for your own safety
          while using FormAI.
        </li>
      </ul>

      <h2>3. Eligibility</h2>
      <p>
        You must be at least 18 years old, or have a parent or guardian&apos;s permission, to subscribe. FormAI is not
        directed at children under 13.
      </p>

      <h2>4. FormAI Pro subscription</h2>
      <ul>
        <li>
          FormAI Pro costs <strong>{LEGAL.price}</strong>, plus any applicable taxes, and gives access to every workout.
        </li>
        <li>
          <strong>Your subscription renews automatically every month</strong> and your payment method is charged
          at the start of each billing period until you cancel.
        </li>
        <li>
          <strong>You can cancel at any time</strong> from the Account page (&ldquo;Manage billing&rdquo;). Cancellation
          stops future charges. You keep access until the end of the period you&apos;ve already paid for.
        </li>
        <li>
          Payments are processed by Stripe. We never see or store your full card number. Stripe&apos;s own terms
          apply to payment processing.
        </li>
        <li>
          We may change the price with at least 30 days&apos; notice before your next renewal. If you don&apos;t
          agree to the new price, you can cancel before it takes effect.
        </li>
        <li>
          Refunds are covered by our <Link href="/refunds">Refund Policy</Link>.
        </li>
      </ul>

      <h2>5. Access on your devices</h2>
      <p>
        Your subscription is saved in the browser you used to subscribe. You can add your other devices with the QR
        code on the Account page. Device links are personal: don&apos;t share them with other people. We may revoke
        access that appears to be shared or resold. If you lose access (for example after clearing your browser
        data), contact us at <ContactLink /> and we&apos;ll help you restore it.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>copy, resell, or redistribute FormAI or access to FormAI Pro;</li>
        <li>try to bypass the paywall, interfere with the service, or reverse engineer it except where the law allows;</li>
        <li>use FormAI for anything unlawful.</li>
      </ul>

      <h2>7. Changes to the service</h2>
      <p>
        We may add, change or remove features and exercises to improve FormAI. If we make a change that materially
        reduces what paid subscribers get, we&apos;ll give notice and you may cancel.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        FormAI, including its design, text and software, belongs to {b} and its licensors. Open-source components are
        used under their own licenses. We give you a personal, non-transferable right to use FormAI while you follow
        these terms.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        FormAI is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent the law allows, we
        disclaim all warranties, express or implied, including fitness for a particular purpose, accuracy, and
        uninterrupted availability. We don&apos;t guarantee any fitness results.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, {b} is not liable for any indirect, incidental, special or consequential
        damages, or for any injury arising from exercise you choose to do. Our total liability for any claim relating
        to FormAI is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits
        liability that cannot be limited by law, or your rights as a consumer under the laws of where you live.
      </p>

      <h2>11. Ending your use</h2>
      <p>
        You can stop using FormAI and cancel at any time. We may suspend or end access if you seriously or repeatedly
        break these terms, and we&apos;ll refund any unused prepaid period if we end access without cause.
      </p>

      <h2>12. Governing law</h2>
      <p>
        {LEGAL.governingLaw
          ? `These terms are governed by the laws of ${LEGAL.governingLaw}, without regard to conflict-of-law rules.`
          : `These terms are governed by the laws of the place where ${b} is established, without regard to conflict-of-law rules.`}{" "}
        If you are a consumer, you also keep any protections given to you by the laws of the country where you live.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may update these terms. We&apos;ll change the &ldquo;last updated&rdquo; date above and, for significant
        changes, tell subscribers in advance. Continuing to use FormAI after changes take effect means you accept them.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these terms? Email <ContactLink />.
      </p>
    </LegalPage>
  );
}
