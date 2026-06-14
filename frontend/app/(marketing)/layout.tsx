import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "ClaimGuard — Turn denied claims into recovered revenue",
  description:
    "ClaimGuard reads your EOBs, explains why each claim was denied, and drafts the appeal automatically — so billing teams file faster, miss fewer deadlines, and recover more revenue.",
  openGraph: {
    title: "ClaimGuard — Turn denied claims into recovered revenue",
    description:
      "AI-powered denial analysis and appeal drafting for medical billing teams.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
