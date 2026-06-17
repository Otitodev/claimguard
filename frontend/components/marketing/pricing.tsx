"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  "Unlimited EOB & denial PDF uploads",
  "Automatic denial analysis and root-cause explanations",
  "AI-drafted appeal letters, ready to review",
  "Appeal deadline tracking with a Needs Action view",
  "Denial analytics by payer and category",
  "Revenue-at-risk and recovery tracking",
  "Email support",
] as const;

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border/50">
      <motion.div
        className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Recover more revenue with less overhead
          </h2>
          <p className="mt-3 text-muted-foreground">
            One simple plan with everything your billing team needs to work
            denials end to end.
          </p>
        </div>

        <Card className="mx-auto max-w-4xl overflow-hidden rounded-3xl border-border bg-card p-0 shadow-xl ring-1 ring-foreground/5 dark:ring-foreground/10">
          <div className="flex flex-col md:flex-row">
            <div className="flex flex-col border-b border-border/50 p-8 md:basis-2/5 md:border-b-0 md:border-r md:p-10">
              <h3 className="text-center text-4xl font-semibold">ClaimGuard</h3>
              <p className="mt-1 text-center text-lg text-muted-foreground">
                For small medical practices
                <br />
                and billing teams
              </p>

              <p className="mt-8 text-center text-xl font-semibold">
                $299 per practice / month
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <Button asChild className="w-full rounded-full">
                  <Link href="/sign-up">Get started</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-full"
                >
                  <Link href="#demo">Book a demo</Link>
                </Button>
              </div>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Includes all features, updates, and future improvements.
              </p>
            </div>

            <div className="flex flex-col justify-between p-8 md:basis-3/5 md:p-10">
              <ul className="flex flex-col gap-3">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      className="size-5 shrink-0 text-status-recovered"
                    />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-8 border-t border-border/50 pt-6 text-sm leading-relaxed text-muted-foreground">
                ClaimGuard works alongside the billing system you already use —
                bring the EOBs you receive today and start recovering denied
                revenue without changing your workflow.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
