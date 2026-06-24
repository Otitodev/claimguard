"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  Mail01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Surfaces the practice's AgentMail inbox — the address a front desk can
 * forward EOBs/denial letters to so ClaimGuard ingests them automatically
 * (same pipeline as a manual upload). When `address` is null the inbox hasn't
 * been provisioned yet, so we show a "coming soon" hint instead.
 */
export function EmailIntakeCard({
  address,
}: {
  address: string | null | undefined;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Inbox address copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select and copy manually");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <HugeiconsIcon icon={Mail01Icon} className="size-4 text-primary" />
          Email intake
        </CardDescription>
        <CardTitle className="text-base font-medium">
          Forward denials — they process automatically
        </CardTitle>
      </CardHeader>
      <CardContent>
        {address ? (
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-md border bg-muted px-3 py-1.5 font-mono text-sm">
              {address}
            </code>
            <Button variant="outline" size="sm" onClick={copy}>
              <HugeiconsIcon
                icon={copied ? Tick02Icon : Copy01Icon}
                data-icon="inline-start"
              />
              {copied ? "Copied" : "Copy"}
            </Button>
            <p className="w-full text-sm text-muted-foreground">
              Forward an EOB or denial letter to this address and ClaimGuard
              parses, classifies, and drafts an appeal — no manual upload needed.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            A dedicated intake inbox hasn&apos;t been set up for this practice
            yet. Once provisioned, you can forward denial letters here and
            they&apos;ll be processed automatically.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
