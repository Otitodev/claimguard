import Link from "next/link";

import { Logo } from "@/components/marketing/logo";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Request a demo", href: "#demo" },
  { label: "Open the app", href: "/dashboard" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              The AI denial workflow that helps medical billing teams recover
              more revenue with less manual work.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-1 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} ClaimGuard. All rights reserved.
          </span>
          <span>Built for small medical practices.</span>
        </div>
      </div>
    </footer>
  );
}
