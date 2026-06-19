"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Menu01Icon } from "@hugeicons/core-free-icons";

import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setIsScrolled(latest > 50);
    if (latest > previous && latest > 150) {
      setIsHidden(true);
      setIsOpen(false);
    } else {
      setIsHidden(false);
    }
  });

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-50 mx-auto w-full px-4 pt-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: isHidden ? 0 : 1, y: isHidden ? -20 : 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <motion.div
        className="relative mx-auto max-w-6xl"
        animate={{ scale: isScrolled ? 0.98 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="flex flex-row items-center justify-between gap-4 rounded-full border border-border p-2 backdrop-blur-xl"
          animate={{
            backgroundColor: "var(--background)",
            boxShadow: isScrolled
              ? "0 4px 20px -5px rgba(0, 0, 0, 0.35)"
              : "0 0 0 0 rgba(0, 0, 0, 0)",
          }}
          transition={{ duration: 0.3 }}
        >
          <Logo className="ml-2" />

          <nav className="hidden flex-row items-center gap-8 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden flex-row items-center gap-2 lg:flex">
            <Button asChild variant="ghost" className="font-medium">
              <Link href="/sign-in">Log in</Link>
            </Button>
            <Button asChild size="lg" className="rounded-full">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>

          <div className="flex flex-row items-center gap-2 lg:hidden">
            <Button asChild className="rounded-full">
              <Link href="/sign-up">Get started</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsOpen((v) => !v)}
            >
              <HugeiconsIcon icon={isOpen ? Cancel01Icon : Menu01Icon} />
            </Button>
          </div>
        </motion.div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden lg:hidden"
            >
              <div className="flex flex-col gap-2 rounded-3xl border border-border bg-background/95 p-4 backdrop-blur-xl">
                {NAV.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className="flex flex-row items-center justify-between rounded-2xl px-4 py-3 font-medium transition-colors hover:bg-muted"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="my-2 border-t border-border" />
                <Button asChild variant="ghost" className="justify-start font-medium">
                  <Link href="/sign-in" onClick={() => setIsOpen(false)}>
                    Log in
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
