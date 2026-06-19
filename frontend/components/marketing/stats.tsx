"use client";

import { motion } from "motion/react";

import { Counter } from "@/components/marketing/counter";

const STATS = [
  { name: "Average denial recovery rate", value: 65, suffix: "%" },
  { name: "From EOB upload to appeal draft", value: 3, suffix: " min" },
  { name: "Hours saved per biller each week", value: 12, suffix: "+" },
] as const;

export function Stats() {
  return (
    <motion.section
      className="border-b border-border/50"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 lg:py-28">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Real results from denial automation
          </h2>
          <p className="max-w-md text-muted-foreground">
            What ClaimGuard delivers for billing teams.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 border-l border-t border-border md:grid-cols-3">
          {STATS.map((stat) => (
            <div
              key={stat.name}
              className="flex flex-col items-center justify-center border-b border-r border-border px-6 py-12 text-center"
            >
              <div className="text-3xl font-semibold tracking-tight text-primary md:text-4xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{stat.name}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Illustrative outcomes based on the ClaimGuard workflow.
        </p>
      </div>
    </motion.section>
  );
}
