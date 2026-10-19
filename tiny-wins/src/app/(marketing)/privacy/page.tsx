import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CONTACT_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 19, 2026">
      <p>
        Tiny Wins (&quot;we&quot;, &quot;us&quot;) makes a cozy self-improvement game starring Pip. This policy explains what we
        collect, why, and the choices you have. We keep it short because we collect very little.
      </p>
      <p className="rounded-2xl bg-honey/40 p-4 text-sm dark:bg-accent/40">
        Before launch, have this policy reviewed for your situation and jurisdiction (for example GDPR, CCPA, and COPPA if
        children may use the app). It is a starting template, not legal advice.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Waitlist:</strong> your email address, when you joined and confirmed, and where you came from (for example a TikTok link). We store a one-way hash of your IP address for abuse prevention, never the IP itself.</li>
        <li><strong>Account:</strong> your email address and a securely hashed password, handled by our authentication provider (Supabase).</li>
        <li><strong>Profile and progress:</strong> the name you choose, your goals and preferences, your timezone, the quests you complete, and the XP, acorns, achievements and decorations you earn.</li>
        <li><strong>Device preferences:</strong> theme and reduced-motion settings are stored only in your browser.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the app: generate your daily quests, save your progress, and show your treehouse.</li>
        <li>To email you about early access and important account messages (like confirming your email or resetting your password).</li>
        <li>To keep Tiny Wins safe from spam and abuse.</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>

      <h2>Who processes it</h2>
      <ul>
        <li>Supabase (database and authentication)</li>
        <li>Vercel (hosting)</li>
        <li>Resend (sending emails)</li>
        <li>Cloudflare Turnstile (optional bot protection on the waitlist form)</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Leave the waitlist any time using the link in any waitlist email.</li>
        <li>Delete your account any time from Settings → Delete account. This permanently removes your profile, progress and treehouse.</li>
        <li>Contact us to access or correct your data: <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
      </ul>

      <h2>Children</h2>
      <p>Tiny Wins is intended for people aged 13 and older. If you believe a younger child has given us personal information, contact us and we will delete it.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we will update the date above and let account holders know.</p>
    </LegalPage>
  );
}
