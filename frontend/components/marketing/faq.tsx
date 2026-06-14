import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Reveal } from "@/components/marketing/reveal";

const FAQS = [
  {
    q: "How does ClaimGuard know why a claim was denied?",
    a: "Upload the EOB or denial PDF and ClaimGuard parses it, extracts the denial codes, and uses AI to explain the root cause in plain language — then recommends whether to appeal, resubmit, or write off.",
  },
  {
    q: "Do I have to change my billing system?",
    a: "No. ClaimGuard works alongside your existing workflow. You bring the EOBs you already receive; we handle the analysis, appeal drafting, and tracking.",
  },
  {
    q: "Are the appeal letters ready to send?",
    a: "Each appeal is drafted automatically with the relevant claim details and denial reasoning. Your team reviews and edits in the built-in editor before submitting — you stay in control.",
  },
  {
    q: "How does it help us hit appeal deadlines?",
    a: "Denials that need attention surface in a Needs Action view with the days remaining before each filing deadline, so nothing slips past the payer's window.",
  },
  {
    q: "Is our patient data secure?",
    a: "Claims data stays within your ClaimGuard workspace and is used only to analyze denials and draft appeals for your practice.",
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className="border-b">
      <div className="mx-auto w-full max-w-3xl px-4 py-20 md:px-6 lg:py-28">
        <Reveal className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything billing teams ask before getting started.
          </p>
        </Reveal>
        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={i * 60}>
              <details
                className="group rounded-2xl border border-border bg-card px-5 py-4 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10"
              >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium">
                {item.q}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
