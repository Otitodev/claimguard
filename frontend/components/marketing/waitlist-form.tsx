"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { submitLead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [practice, setPractice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      toast.error("Please enter a valid work email.");
      return;
    }
    setSubmitting(true);
    try {
      await submitLead(email, practice);
      setSubmitted(true);
      toast.success("You're on the list — we'll be in touch shortly.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-border bg-card p-8 text-center shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10">
        <span className="flex size-12 items-center justify-center rounded-full bg-status-recovered/10 text-status-recovered">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-6" />
        </span>
        <h3 className="text-lg font-semibold">Thanks{practice ? `, ${practice}` : ""}!</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ve got your request at <span className="font-medium text-foreground">{email}</span>.
          Our team will reach out to schedule your ClaimGuard demo.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md flex-col gap-4 rounded-3xl border border-border bg-card p-8 shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="practice">Practice name</Label>
        <Input
          id="practice"
          name="practice"
          placeholder="Northside Family Care"
          value={practice}
          onChange={(e) => setPractice(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@practice.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Submitting…" : "Request a demo"}
        {!submitting && (
          <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No credit card required. We&apos;ll only use your email to set up the demo.
      </p>
    </form>
  );
}
