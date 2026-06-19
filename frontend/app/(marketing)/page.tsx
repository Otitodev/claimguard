import { HugeiconsIcon } from "@hugeicons/react";
import {
  Analytics01Icon,
  Clock01Icon,
  DollarCircleIcon,
  Invoice03Icon,
  Mail01Icon,
  MoneyReceive01Icon,
  Pdf01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { CardArt } from "@/components/marketing/card-art";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Stats } from "@/components/marketing/stats";
import { Pricing } from "@/components/marketing/pricing";
import { Faq } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type IconType = Parameters<typeof HugeiconsIcon>[0]["icon"];

const PROBLEMS: {
  icon: IconType;
  title: string;
  body: string;
  tone: string;
  image?: string;
}[] = [
  {
    icon: Invoice03Icon,
    title: "Denials pile up faster than you can work them",
    body: "Every denied claim is revenue sitting on the table. Without a system, the backlog grows and dollars quietly age out.",
    tone: "text-status-denied",
    image: "/problems/backlog.png",
  },
  {
    icon: Search01Icon,
    title: "Figuring out the root cause is slow, manual work",
    body: "Decoding denial codes and EOB language eats hours your billers don't have — and the reason often gets misread.",
    tone: "text-status-pending",
    image: "/problems/root-cause.png",
  },
  {
    icon: Clock01Icon,
    title: "Appeal deadlines slip past unnoticed",
    body: "Payer filing windows are short. Miss one and the claim is gone for good, no matter how strong the case was.",
    tone: "text-status-denied",
    image: "/problems/deadlines.png",
  },
];

const FEATURES: { icon: IconType; title: string; body: string }[] = [
  {
    icon: Search01Icon,
    title: "Instant denial analysis",
    body: "Every denial code and EOB turned into a plain-English reason your biller understands in seconds.",
  },
  {
    icon: Mail01Icon,
    title: "AI-drafted appeal letters",
    body: "Professional, payer-ready appeals drafted instantly. Review, edit, and submit in under 5 minutes.",
  },
  {
    icon: Clock01Icon,
    title: "Deadline + response tracking",
    body: "See drafts near their filing deadline and submitted appeals past the expected payer response window — nothing slips through.",
  },
  {
    icon: Analytics01Icon,
    title: "Denial analytics by payer",
    body: "Spot which payers and categories cost you the most so you can fix root causes and prevent future denials.",
  },
  {
    icon: MoneyReceive01Icon,
    title: "Recovery tracking",
    body: "Know exactly how much denied revenue you've recovered this month and what's still at risk.",
  },
  {
    icon: Pdf01Icon,
    title: "No new billing system",
    body: "Works with the EOB PDFs you already get from payers. Drag-and-drop or forward by email.",
  },
];

export default function LandingPage() {
  return (
    <>
      <Hero />

      {/* Problem */}
      <section className="border-b border-border/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your biller is losing hours a week to denials
            </h2>
            <p className="mt-3 text-muted-foreground">
              Small practices lose $80K–$150K a year to denials that are too
              slow, too manual, or too easy to miss.
            </p>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((item, i) => (
              <Reveal key={item.title} delay={i * 75}>
                <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-card p-3 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <CardArt src={item.image} icon={item.icon} tone={item.tone} />
                  <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* Features */}
      <section id="features" className="border-b border-border/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Cut appeal writing from 45 minutes to 5
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built for small-practice billing teams drowning in denials.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 3) * 75}>
                <Card className="h-full transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <HugeiconsIcon icon={feature.icon} className="size-5" />
                    </span>
                    <CardTitle className="mt-3 text-base">
                      {feature.title}
                    </CardTitle>
                    <CardDescription>{feature.body}</CardDescription>
                  </CardHeader>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <Stats />

      {/* Pricing */}
      <Pricing />

      <Faq />

      {/* CTA / demo request */}
      <section id="demo" className="px-4 py-20 md:px-6 lg:py-28">
        <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-primary/20 bg-card px-6 py-16 text-center md:px-12">
          {/* soft blue glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-3xl"
          />
          {/* dotted grid texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]"
          />
          <Reveal className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <HugeiconsIcon
                icon={DollarCircleIcon}
                className="size-3.5 text-primary"
              />
              Start recovering revenue
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              See ClaimGuard on your denials
            </h2>
            <p className="mt-3 text-muted-foreground">
              Request a demo and we&apos;ll show you how much of your denied
              revenue ClaimGuard can help you recover.
            </p>
            <div className="mt-8">
              <WaitlistForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
