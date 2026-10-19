import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CONTACT_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 19, 2026">
      <p>Welcome to Tiny Wins! By joining the waitlist or creating an account, you agree to these terms.</p>
      <p className="rounded-2xl bg-honey/40 p-4 text-sm dark:bg-accent/40">
        This is a starting template for an early-access product. Have it reviewed before your public launch.
      </p>

      <h2>Early access</h2>
      <p>Tiny Wins is in early access. Features may change, and we may reset or adjust game balances while we tune the experience. We&apos;ll always try to be fair and give notice.</p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 13 years old to create an account.</li>
        <li>Keep your password safe. You are responsible for activity on your account.</li>
        <li>You can delete your account at any time from Settings.</li>
      </ul>

      <h2>Acorns, XP and decorations</h2>
      <p>Acorns, XP, levels and decorations are part of the game. They have no cash value, cannot be bought or sold, and cannot be transferred between accounts.</p>

      <h2>Be kind</h2>
      <p>Don&apos;t misuse Tiny Wins: no automated sign-ups, no attempts to break, overload or cheat the service, and no using it to harm others. We may suspend accounts that do.</p>

      <h2>Not medical advice</h2>
      <p>Tiny Wins offers gentle, everyday suggestions. It is not medical, mental-health, financial or professional advice. If you&apos;re struggling, please reach out to someone you trust or a qualified professional.</p>

      <h2>Pip</h2>
      <p>Pip, Tiny Wins, and the related artwork and stories belong to their creator. Please don&apos;t use them commercially without permission.</p>

      <h2>Liability</h2>
      <p>Tiny Wins is provided &quot;as is&quot;. To the extent allowed by law, we are not liable for indirect or consequential losses arising from your use of the service.</p>

      <h2>Contact</h2>
      <p>Questions? Email <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
