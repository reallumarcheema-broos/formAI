import type { Metadata } from "next";
import { ContactLink, LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "How cancellations and refunds work for FormAI Pro.",
};

export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy">
      <p>
        FormAI Pro is a monthly subscription at <strong>{LEGAL.price}</strong>. We want it to be easy to try and easy
        to leave.
      </p>

      <h2>Cancel anytime</h2>
      <ul>
        <li>
          Open <strong>Account → Manage billing</strong> and cancel. It takes effect immediately for future billing:
          you won&apos;t be charged again.
        </li>
        <li>You keep access to FormAI Pro until the end of the month you&apos;ve already paid for.</li>
      </ul>

      <h2>Refunds</h2>
      <ul>
        <li>
          <strong>First payment:</strong> if FormAI doesn&apos;t work for you, email us within{" "}
          <strong>7 days of your first payment</strong> and we&apos;ll refund it in full, no questions asked.
        </li>
        <li>
          <strong>Renewals:</strong> monthly renewals are generally not refundable once the new month has started. If
          you forgot to cancel and haven&apos;t used FormAI since the renewal, contact us within 7 days and we&apos;ll
          do our best to help.
        </li>
        <li>
          <strong>Billing mistakes:</strong> if you were charged twice, charged after cancelling, or charged the wrong
          amount, we&apos;ll refund the incorrect charge in full.
        </li>
        <li>
          <strong>Technical problems:</strong> if FormAI didn&apos;t work on your device and we can&apos;t fix it,
          we&apos;ll refund the affected period.
        </li>
      </ul>

      <h2>How to ask for a refund</h2>
      <p>
        Email <ContactLink /> from the address you used at checkout, and tell us the date of the charge. Approved
        refunds go back to your original payment method, usually within 5–10 business days, depending on your bank.
      </p>

      <h2>Your legal rights</h2>
      <p>
        This policy doesn&apos;t limit any refund or cancellation rights you have under the consumer laws of where you
        live. For example, in the EU and UK you may have a 14-day right to withdraw from a digital service contract.
      </p>
    </LegalPage>
  );
}
