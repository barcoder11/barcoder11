import type { Metadata } from "next";
import { LegalDraft } from "@/components/marketing/LegalDraft";

export const metadata: Metadata = { title: "Terms of Use (draft)" };

export default function TermsPage() {
  return (
    <LegalDraft title="Terms of Use">
      <h2>A fictional game</h2>
      <p>
        Pawtopia&apos;s rescue stories and characters are fictional and created with the help of AI. No real animals are
        rescued, adopted, housed or cared for through Pawtopia. A “virtual adoption” is a game feature only.
      </p>
      <h2>Not advice, not a charity</h2>
      <p>
        Nothing in Pawtopia is wildlife care, veterinary or rescue guidance. Never approach or handle wild animals —
        contact local wildlife authorities instead. Pawtopia is not a charity and nothing in the game is a donation.
      </p>
      <h2>Virtual items</h2>
      <p>
        Acorns and decorations are virtual, have no monetary value, can&apos;t be bought or sold for real money, and may
        be rebalanced.
      </p>
      <h2>Eligibility</h2>
      <p>You must be 13 or older to create an account.</p>
      <h2>Fair play</h2>
      <p>
        Don&apos;t attempt to exploit, overload or access other players&apos; accounts or data. We may suspend accounts
        that do.
      </p>
      <h2>Changes and contact</h2>
      <p>[Add governing law, liability limitations, changes policy and contact details after legal review.]</p>
    </LegalDraft>
  );
}
