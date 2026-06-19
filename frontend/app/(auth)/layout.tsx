import type { ReactNode } from "react";

import { Logo } from "@/components/marketing/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/30 p-6">
      <Logo className="h-8" />
      {children}
    </div>
  );
}
