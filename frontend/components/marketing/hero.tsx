import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { VantaDots } from "@/components/marketing/vanta-dots";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/50">
      <VantaDots />
      {/* overlay gradient to ensure text readability over the dots */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-background/60 via-background/30 to-background"
      />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 px-4 pb-12 pt-28 md:px-6 md:pb-16 md:pt-36 lg:grid-cols-2 lg:pb-20">
        <div className="flex animate-in flex-col items-start gap-6 fade-in slide-in-from-bottom-4 duration-700 [animation-delay:100ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <HugeiconsIcon icon={SparklesIcon} className="size-3.5 text-primary" />
            Stop losing revenue to ignored denials
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Stop losing $80K–$150K/year on{" "}
            <span className="text-primary">insurance denials</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            ClaimGuard automates EOB processing for small medical practices. AI
            classifies denials and drafts professional appeals so your team can
            focus on patients, not paperwork.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="cta-glow">
              <Link href="#demo">
                Request a demo
                <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {[
              "No credit card required",
              "Works with your existing EOBs",
              "Set up in minutes",
            ].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-4 text-status-recovered"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

/** Static product mock built from the real design system — no backend call. */
function HeroPreview() {
  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:300ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
      <div className="rounded-4xl bg-card p-5 shadow-xl ring-1 ring-foreground/5 dark:ring-foreground/10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Denial overview</p>
            <p className="text-xs text-muted-foreground">Northside Family Care</p>
          </div>
          <StatusBadge value="appealed" kind="claim" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MockMetric label="Revenue at risk" value="$48,200" tone="denied" />
          <MockMetric label="Recovered this month" value="$31,750" tone="recovered" />
          <MockMetric label="Denial rate" value="12.4%" tone="pending" />
          <MockMetric label="Appeals in progress" value="18" />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Latest denial
            </p>
            <StatusBadge value="appeal" kind="classification" />
          </div>
          <p className="text-sm font-medium">CO-197 · Prior auth missing</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aetna · Claim #CLM-20418 · appeal drafted automatically
          </p>
        </div>
      </div>
    </div>
  );
}

function MockMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "denied" | "recovered" | "pending";
}) {
  const toneClass =
    tone === "denied"
      ? "text-status-denied"
      : tone === "recovered"
        ? "text-status-recovered"
        : tone === "pending"
          ? "text-status-pending"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
