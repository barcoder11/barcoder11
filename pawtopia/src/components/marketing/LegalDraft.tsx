import type { ReactNode } from "react";

export function LegalDraft({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-4 rounded-2xl bg-[#FCEFD6] px-4 py-3 text-sm font-bold text-[#7A4B12]" role="note">
        ⚠️ DRAFT — placeholder text for the MVP. This must be reviewed and replaced by a qualified lawyer before public launch.
      </p>
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <div className="mt-6 grid gap-4 leading-relaxed text-ink-soft [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}
