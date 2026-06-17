"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Analytics01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CloudUploadIcon,
  Invoice03Icon,
  MoneyReceive01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { WaveBackdrop } from "@/components/marketing/wave-backdrop";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  };
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-36 md:px-6 md:pt-44">
        <div className="flex flex-col gap-8 text-left lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <motion.h1
            {...fadeUp(0.05)}
            className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:max-w-2xl lg:text-6xl"
          >
            Recover the revenue your denials are{" "}
            <span className="text-primary">quietly costing you</span>
          </motion.h1>

          <motion.div
            {...fadeUp(0.15)}
            className="flex flex-col gap-6 lg:max-w-md"
          >
            <p className="text-lg text-muted-foreground">
              ClaimGuard automates EOB processing for small medical practices.
              AI classifies denials and drafts professional appeals so your team
              can focus on patients, not paperwork.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="cta-glow">
                <Link href="#demo">
                  Request a demo
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    data-icon="inline-end"
                  />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.42 }}
          className="relative mt-16 w-full md:mt-24"
        >
          {/* bordered blue wave band the dashboard rests on */}
          <div
            aria-hidden
            className="absolute inset-x-0 -top-8 -bottom-8 overflow-hidden rounded-[2rem] border border-primary/30 md:-top-12 md:-bottom-12 md:rounded-[2.5rem]"
          >
            <WaveBackdrop className="absolute inset-0 h-full w-full" />
          </div>
          <div className="relative z-10 px-3 sm:px-6 md:px-10">
            <HeroPreview />
          </div>
          {/* fade most of the mock + waves into the background, leaving only the top visible */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -bottom-8 z-20 bg-gradient-to-b from-transparent via-background/75 to-background md:-bottom-12"
          />
        </motion.div>
      </div>
    </section>
  );
}

const NAV = [
  { icon: Analytics01Icon, label: "Dashboard", active: true },
  { icon: Invoice03Icon, label: "Claims" },
  { icon: Clock01Icon, label: "Needs action" },
  { icon: MoneyReceive01Icon, label: "Recovery" },
  { icon: CloudUploadIcon, label: "Upload" },
];

/** Big browser-framed dashboard mock built from the real design system. */
function HeroPreview() {
  return (
    <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-foreground/10 bg-card text-left shadow-2xl ring-1 ring-foreground/10">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
        <span className="size-3 rounded-full bg-status-denied/60" />
        <span className="size-3 rounded-full bg-status-pending/60" />
        <span className="size-3 rounded-full bg-status-recovered/60" />
        <div className="mx-auto flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-status-recovered" />
          app.claimguard.ai/dashboard
        </div>
      </div>

      <div className="grid grid-cols-[60px_1fr] md:grid-cols-[200px_1fr]">
        {/* sidebar */}
        <aside className="border-r border-border/60 bg-muted/20 p-3 md:p-4">
          <div className="mb-5 flex items-center gap-2 px-1">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" />
            </span>
            <span className="hidden text-sm font-semibold md:inline">
              ClaimGuard
            </span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <span
                key={item.label}
                className={
                  "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm " +
                  (item.active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground")
                }
              >
                <HugeiconsIcon icon={item.icon} className="size-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </span>
            ))}
          </nav>
        </aside>

        {/* main content */}
        <div className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Denial overview</p>
              <p className="text-xs text-muted-foreground">
                Northside Family Care
              </p>
            </div>
            <StatusBadge value="appealed" kind="claim" />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MockMetric label="Revenue at risk" value="$48,200" tone="denied" />
            <MockMetric label="Recovered" value="$31,750" tone="recovered" />
            <MockMetric label="Denial rate" value="12.4%" tone="pending" />
            <MockMetric label="Appeals open" value="18" />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Recovery trend
                </p>
                <span className="text-xs font-semibold text-status-recovered">
                  +65%
                </span>
              </div>
              <div className="flex h-40 items-end justify-between gap-1.5">
                {[38, 52, 44, 66, 58, 80, 70, 92].map((h, i) => (
                  <div
                    key={i}
                    className={
                      "w-full rounded-t-sm " +
                      (i === 7 ? "bg-primary" : "bg-primary/25")
                    }
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Latest denial
                </p>
                <StatusBadge value="appeal" kind="classification" />
              </div>
              <p className="text-sm font-medium">CO-197 · Prior auth missing</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aetna · Claim #CLM-20418
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
                Appeal letter drafted automatically
              </div>
            </div>
          </div>
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
