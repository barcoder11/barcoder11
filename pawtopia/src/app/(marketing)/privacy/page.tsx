import type { Metadata } from "next";
import { LegalDraft } from "@/components/marketing/LegalDraft";

export const metadata: Metadata = { title: "Privacy Policy (draft)" };

export default function PrivacyPage() {
  return (
    <LegalDraft title="Privacy Policy">
      <p>Pawtopia is a fictional virtual animal sanctuary game for a general audience aged 13 and over. We collect as little as we can.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email address (for passwordless sign-in), optional display name, time zone, and settings.</li>
        <li><strong>Game data:</strong> your virtual adoptions, care activity, acorn balance and history, decorations and unlocked chapters.</li>
        <li><strong>Waitlist:</strong> your email, confirmation status, and whether you opted into news. The waitlist is separate from game accounts.</li>
        <li><strong>Analytics:</strong> a random pseudonymous visitor ID stored in a cookie, which rescue link and campaign (e.g. “instagram”) brought you here, and funnel events such as page views, sign-up and adoption. We do not store full IP addresses in our analytics.</li>
      </ul>
      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No advertising trackers, no selling of personal data, no real-money payments.</li>
        <li>We don&apos;t collect birthdates; we ask you to confirm you are 13 or older.</li>
      </ul>
      <h2>Cookies</h2>
      <p>Essential cookies keep you signed in. An analytics cookie (pseudonymous ID, 180 days) and a first-visit attribution cookie (30 days) help us understand which videos bring players.</p>
      <h2>Your choices</h2>
      <ul>
        <li>Download your data or permanently delete your account from your Profile page.</li>
        <li>Unsubscribe from or delete your waitlist entry with the link in any waitlist email.</li>
        <li>Turn news emails on or off in your Profile settings.</li>
      </ul>
      <h2>Service providers</h2>
      <p>We use Supabase (database, authentication, file storage), Vercel (hosting) and an email delivery provider. [List final providers, regions and contact details here.]</p>
      <h2>Contact</h2>
      <p>[Add a contact email and the legal entity operating Pawtopia.]</p>
    </LegalDraft>
  );
}
