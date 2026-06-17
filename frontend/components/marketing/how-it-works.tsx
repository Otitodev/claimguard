"use client";

import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  ArrowRight01Icon,
  CloudUploadIcon,
  Mail01Icon,
  Pdf01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Forward EOBs or upload PDFs",
    body: "No new billing system. Drop in the denial or EOB PDFs you already receive by mail, fax, or portal.",
    mock: <UploadMock />,
  },
  {
    title: "AI extracts + classifies the denial",
    body: "Get a plain-English reason for every denial, a recommendation to appeal, resubmit, or write off — and a ready-to-edit appeal letter.",
    mock: <AnalysisMock />,
  },
  {
    title: "Review, submit, and track recovery",
    body: "Review the AI-drafted letter, submit with one click, and track every appeal through to payment. Never miss a deadline.",
    mock: <RecoveryMock />,
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border/50 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            From denial to recovery in minutes
          </h2>
          <p className="mt-3 text-muted-foreground">
            Forward EOBs or drag-and-drop PDFs — AI extracts, classifies, and
            drafts appeals so your biller reviews in minutes instead of hours.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: i * 0.12,
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="text-xl font-semibold tracking-tight">
                  {step.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
              <div className="mt-6 flex-1">{step.mock}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full rounded-2xl border border-border bg-background p-5">
      <p className="mb-4 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** Step 1: an upload node branching down to the payers you bill. */
function UploadMock() {
  const payers = ["Aetna", "Cigna", "UHC"];
  return (
    <MockShell label="Upload">
      <div className="flex flex-col items-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <HugeiconsIcon icon={Pdf01Icon} className="size-6" />
        </div>

        {/* branching connectors */}
        <div className="h-5 w-px bg-border" />
        <div className="flex w-full items-start justify-center">
          <div className="h-px w-2/3 bg-border" />
        </div>
        <div className="-mt-px flex w-2/3 justify-between">
          {payers.map((p) => (
            <div key={p} className="h-3 w-px bg-border" />
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {payers.map((p) => (
            <span
              key={p}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {p}
            </span>
          ))}
        </div>

        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground"
        >
          <HugeiconsIcon icon={CloudUploadIcon} className="size-4" />
          Upload EOB
        </button>
      </div>
    </MockShell>
  );
}

/** Step 2: the denial-analysis tracker — code, reason, recommendation. */
function AnalysisMock() {
  const rows = [
    {
      icon: Search01Icon,
      code: "CO-197",
      reason: "Prior auth missing",
      rec: "Appeal",
      tone: "appealed" as const,
    },
    {
      icon: AiBrain01Icon,
      code: "CO-45",
      reason: "Over fee schedule",
      rec: "Resubmit",
      tone: "pending" as const,
    },
    {
      icon: Mail01Icon,
      code: "PR-1",
      reason: "Deductible",
      rec: "Patient owes",
      tone: "neutral" as const,
    },
  ];
  const toneClass: Record<string, string> = {
    appealed: "border-status-appealed/30 bg-status-appealed/10 text-status-appealed",
    pending: "border-status-pending/30 bg-status-pending/10 text-status-pending",
    neutral: "border-border bg-muted text-muted-foreground",
  };
  return (
    <MockShell label="Denial analysis">
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div
            key={r.code}
            className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground ring-1 ring-border">
              <HugeiconsIcon icon={r.icon} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.code}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.reason}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                toneClass[r.tone],
              )}
            >
              {r.rec}
            </span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

/** Step 3: recovery overview bar chart + headline stat. */
function RecoveryMock() {
  const bars = [38, 52, 44, 66, 58, 80, 70, 92];
  return (
    <MockShell label="Recovery overview">
      <div className="flex h-28 items-end justify-between gap-2">
        {bars.map((h, i) => (
          <div
            key={i}
            className={cn(
              "w-full rounded-t-md",
              i === bars.length - 1
                ? "bg-primary"
                : "bg-primary/25",
            )}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-5 flex items-end gap-3 border-t border-border pt-4">
        <p className="text-3xl font-semibold tracking-tight text-primary">
          65%
        </p>
        <p className="pb-1 text-xs leading-snug text-muted-foreground">
          of denied revenue recovered, up from last quarter
        </p>
      </div>
    </MockShell>
  );
}
