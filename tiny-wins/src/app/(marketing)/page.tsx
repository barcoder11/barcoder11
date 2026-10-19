import { ArrowRight, Heart, Leaf, Sparkles, Timer } from "lucide-react";
import Link from "next/link";
import { AcornIcon, TikTokIcon } from "@/components/brand/icons";
import { AppPreview } from "@/components/marketing/app-preview";
import { QuestDemo } from "@/components/marketing/quest-demo";
import { TikTokGreeting } from "@/components/marketing/tiktok-greeting";
import { TreehouseDemo } from "@/components/marketing/treehouse-demo";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { Pip } from "@/components/pip/pip";
import { Button } from "@/components/ui/button";
import { TIKTOK_URL } from "@/lib/env";

const STEPS = [
  { emoji: "🎯", title: "Pick what matters", body: "Fitness, studying, organization, saving money, kindness. Choose one or all five." },
  { emoji: "✅", title: "Do 3 tiny quests", body: "Every day you get three small, doable quests. Most take under 5 minutes." },
  { emoji: "🌳", title: "Watch Pip's world grow", body: "Earn XP and acorns, level up Pip, and turn a bare nook into the coziest treehouse in the forest." },
];

const REASONS = [
  { icon: Heart, title: "No guilt. Ever.", body: "Miss a day? Pip just says welcome back. You never lose acorns, levels, or decorations." },
  { icon: Timer, title: "Actually tiny", body: "Quests are 1 to 10 minutes. Small enough to do on your worst day, which is the whole point." },
  { icon: Sparkles, title: "Rewards you can see", body: "Every win turns into something real in your treehouse. Progress you can feel, not just a number." },
  { icon: Leaf, title: "Made for Pip's fans", body: "If Pip's struggles feel familiar, this is the app where you two get better together." },
];

const FAQ = [
  { q: "When can I start?", a: "We're opening the treehouse to early-access members first. Join the waitlist and confirm your email, and we'll let you know the moment your spot opens." },
  { q: "Is it free?", a: "Yes. Early access is free. There are no payments or subscriptions in Tiny Wins right now." },
  { q: "Do I need TikTok?", a: "Nope! Pip's animated series lives on TikTok, but the app works on its own on any phone, tablet, or computer." },
  { q: "What happens if I miss a day?", a: "Nothing bad. Your new quests are waiting, and everything you've earned stays put. Tiny Wins is built to be kind." },
  { q: "What do you do with my email?", a: "We only use it to send you Tiny Wins updates. We never sell it, and every email has a link to remove yourself." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-sage/80 via-background to-background dark:from-secondary/40" />
        <div aria-hidden className="absolute -top-24 -right-24 -z-10 size-[420px] rounded-full bg-honey/40 blur-3xl dark:bg-accent/30" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-16 md:pb-24">
          <div className="flex flex-col items-start gap-5">
            <TikTokGreeting />
            <h1 className="text-[2.6rem] leading-[1.05] font-bold text-forest-deep sm:text-6xl dark:text-sage">
              Help Pip grow,
              <br />
              <span className="text-bark dark:text-honey">one tiny win</span> at a time.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground sm:text-xl">
              Tiny Wins turns small real-life steps into a cozy game. Do three little quests a day, earn acorns, and build Pip the
              treehouse of his dreams.
            </p>
            <WaitlistForm className="max-w-lg" id="hero-join" />
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex -space-x-2" aria-hidden>
                {["🐿️", "🌰", "🌳", "💛"].map((e) => (
                  <span key={e} className="grid size-8 place-items-center rounded-full border-2 border-background bg-card text-base shadow-soft">
                    {e}
                  </span>
                ))}
              </div>
              Big dreams. Small steps. One acorn at a time.
            </div>
          </div>
          <div className="relative">
            <AppPreview />
            <AcornIcon className="absolute top-10 -left-2 size-10 animate-float sm:left-6" />
            <AcornIcon className="absolute right-0 bottom-16 size-8 animate-float [animation-delay:1.2s] sm:right-6" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="How it works" title="Small steps that actually stick" />
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
                <span className="absolute top-5 right-5 font-display text-5xl font-bold text-muted" aria-hidden>
                  {i + 1}
                </span>
                <span className="text-4xl" aria-hidden>{s.emoji}</span>
                <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Daily quests demo */}
      <section className="bg-sage/40 py-16 sm:py-24 dark:bg-secondary/20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <SectionTitle align="left" eyebrow="Daily quests" title="Three tiny quests. Every single day." />
            <p className="mt-4 text-lg text-muted-foreground">
              Your quests reset each morning in your own timezone and match the goals you chose. Not feeling one? Swap it once a
              day. Every quest pays out XP and acorns, and the server makes sure every reward is counted exactly once.
            </p>
            <ul className="mt-6 space-y-2 font-semibold">
              {["Make your bed", "Study for 10 minutes", "Track one expense", "Do something kind"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-forest text-xs text-white">✓</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <QuestDemo />
        </div>
      </section>

      {/* Treehouse */}
      <section id="treehouse" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
          <div className="md:order-2">
            <SectionTitle align="left" eyebrow="Pip's treehouse" title="Your wins become a home" />
            <p className="mt-4 text-lg text-muted-foreground">
              Spend acorns in the shop on beds, plants, lamps, rugs and more, then place them wherever you like. As Pip levels up,
              the treehouse itself grows: a lantern porch, a firefly canopy, and eventually a rope swing under the stars.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm font-bold">
              {[
                ["36", "decorations"],
                ["12", "spots to fill"],
                ["4", "treehouse stages"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-2xl bg-card p-3 shadow-soft">
                  <div className="font-display text-2xl text-forest dark:text-sage">{n}</div>
                  <div className="text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <TreehouseDemo />
        </div>
      </section>

      {/* Reasons */}
      <section className="bg-card/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="Why join" title="A self-improvement app that's actually nice to you" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl border border-border/70 bg-background p-6 shadow-soft">
                <span className="grid size-12 place-items-center rounded-2xl bg-honey/60 text-bark-deep dark:bg-accent dark:text-honey">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-1 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionTitle eyebrow="Questions" title="Good questions, honest answers" />
          <div className="mt-8 flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border/70 bg-card p-5 shadow-soft open:shadow-lift">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold">
                  {f.q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="join" className="scroll-mt-20 px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-forest px-6 py-12 text-center text-white shadow-lift sm:px-12 sm:py-16 dark:bg-forest-deep">
          <div aria-hidden className="absolute -bottom-24 -left-16 size-72 rounded-full bg-hoodie/40 blur-3xl" />
          <div aria-hidden className="absolute -top-20 -right-10 size-72 rounded-full bg-honey/30 blur-3xl" />
          <div className="relative flex flex-col items-center gap-4">
            <Pip pose="cheer" size={130} />
            <h2 className="max-w-xl text-3xl font-bold sm:text-5xl">Pip saved you a spot in the treehouse</h2>
            <p className="max-w-lg text-lg text-white/85">Join the early-access list. We&apos;ll email you when the doors open.</p>
            <div className="w-full max-w-lg text-left text-foreground [&_.text-muted-foreground]:text-white/75 [&_[role=alert]]:text-honey">
              <WaitlistForm buttonVariant="honey" />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button asChild variant="secondary">
                <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer">
                  <TikTokIcon /> Watch Pip on TikTok
                </a>
              </Button>
              <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                <Link href="/signup">
                  Ready now? Create your account <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionTitle({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="text-sm font-extrabold tracking-widest text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h2>
    </div>
  );
}
