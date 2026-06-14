import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  Analytics01Icon,
  ChartUpIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  CloudUploadIcon,
  DollarCircleIcon,
  Invoice03Icon,
  Mail01Icon,
  MoneyReceive01Icon,
  Pdf01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Hero } from "@/components/marketing/hero";
import { Faq } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type IconType = Parameters<typeof HugeiconsIcon>[0]["icon"];

const PROBLEMS: { icon: IconType; title: string; body: string; tone: string }[] =
  [
    {
      icon: Invoice03Icon,
      title: "Denials pile up faster than you can work them",
      body: "Every denied claim is revenue sitting on the table. Without a system, the backlog grows and dollars quietly age out.",
      tone: "text-status-denied",
    },
    {
      icon: Search01Icon,
      title: "Figuring out the root cause is slow, manual work",
      body: "Decoding denial codes and EOB language eats hours your billers don't have — and the reason often gets misread.",
      tone: "text-status-pending",
    },
    {
      icon: Clock01Icon,
      title: "Appeal deadlines slip past unnoticed",
      body: "Payer filing windows are short. Miss one and the claim is gone for good, no matter how strong the case was.",
      tone: "text-status-denied",
    },
  ];

const STEPS: { icon: IconType; title: string; body: string }[] = [
  {
    icon: CloudUploadIcon,
    title: "Upload the EOB",
    body: "Drop in the denial or EOB PDF you already receive. ClaimGuard parses it and pulls out the denial codes automatically.",
  },
  {
    icon: AiBrain01Icon,
    title: "AI explains it and drafts the appeal",
    body: "Get a plain-language reason for the denial, a recommendation to appeal, resubmit, or write off — and a ready-to-edit appeal letter.",
  },
  {
    icon: ChartUpIcon,
    title: "Track it through to recovery",
    body: "Follow each claim from denial to appeal to payment, with deadlines and recovered dollars in one place.",
  },
];

const FEATURES: { icon: IconType; title: string; body: string }[] = [
  {
    icon: Search01Icon,
    title: "Automatic denial analysis",
    body: "Denial codes and EOB text turned into a clear, actionable reason for every claim.",
  },
  {
    icon: Mail01Icon,
    title: "AI-drafted appeal letters",
    body: "Professional appeals drafted instantly, ready for your team to review and send.",
  },
  {
    icon: Clock01Icon,
    title: "Deadline tracking",
    body: "A Needs Action view surfaces claims by days-to-deadline so nothing slips through.",
  },
  {
    icon: Analytics01Icon,
    title: "Denial analytics by payer",
    body: "Spot which payers and denial categories cost you the most, and act on the patterns.",
  },
  {
    icon: MoneyReceive01Icon,
    title: "Recovery tracking",
    body: "See revenue at risk versus recovered, so you always know what your appeals are returning.",
  },
  {
    icon: Pdf01Icon,
    title: "Works with your EOB PDFs",
    body: "No new billing system — bring the documents you already get from payers today.",
  },
];

const OUTCOMES: { icon: IconType; stat: string; label: string }[] = [
  {
    icon: ChartUpIcon,
    stat: "Recover more",
    label: "of the denied revenue you're already owed",
  },
  {
    icon: Clock01Icon,
    stat: "Minutes, not hours",
    label: "to analyze a denial and draft its appeal",
  },
  {
    icon: CheckmarkBadge01Icon,
    stat: "Fewer missed deadlines",
    label: "with appeal windows tracked automatically",
  },
];

export default function LandingPage() {
  return (
    <>
      <Hero />

      {/* Problem */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Denials are draining your bottom line
            </h2>
            <p className="mt-3 text-muted-foreground">
              Billing teams lose real revenue to denials that are too slow,
              too manual, and too easy to miss.
            </p>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((item, i) => (
              <Reveal key={item.title} delay={i * 75}>
                <Card className="h-full transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl bg-muted ${item.tone}`}
                  >
                    <HugeiconsIcon icon={item.icon} className="size-5" />
                  </span>
                  <CardTitle className="mt-3 text-lg">{item.title}</CardTitle>
                </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              From denial to recovery in three steps
            </h2>
            <p className="mt-3 text-muted-foreground">
              The same parse → classify → draft pipeline your team would run by
              hand, done automatically.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 100} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <HugeiconsIcon icon={step.icon} className="size-5" />
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to work denials
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built for billing teams, from first denial to recovered payment.
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
      <section className="border-b bg-primary/5">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {OUTCOMES.map((item, i) => (
              <Reveal
                key={item.stat}
                delay={i * 100}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={item.icon} className="size-5" />
                </span>
                <p className="text-2xl font-semibold tracking-tight">
                  {item.stat}
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {item.label}
                </p>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Illustrative outcomes based on the ClaimGuard workflow.
          </p>
        </div>
      </section>

      <Faq />

      {/* CTA / demo request */}
      <section id="demo" className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
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
          </Reveal>
          <Reveal delay={100}>
            <WaitlistForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
