import Link from "next/link";

import { Logo } from "@/components/marketing/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "FAQ", href: "#faq" },
      { label: "Open the app", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Request a demo", href: "#demo" },
      { label: "Contact", href: "#demo" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:px-6">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            The AI denial workflow that helps medical billing teams recover more
            revenue with less manual work.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-3">
            <p className="text-sm font-semibold">{col.title}</p>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground md:px-6">
          © {new Date().getFullYear()} ClaimGuard. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
