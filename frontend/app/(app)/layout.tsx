import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { UserMenu } from "@/components/user-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { api, defaultPractice, safe } from "@/lib/api-server";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const practice = await defaultPractice();
  const needs = practice ? await safe(api.needsAction(practice.id), []) : [];

  return (
    <SidebarProvider>
      <AppSidebar needsActionCount={needs.length} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-5"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">
              {practice?.name ?? "ClaimGuard"}
            </span>
            <span className="text-xs text-muted-foreground">Claims ledger</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ModeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {practice ? (
            children
          ) : (
            <Alert variant="destructive" className="max-w-2xl">
              <HugeiconsIcon icon={Alert02Icon} />
              <AlertTitle>Backend not reachable</AlertTitle>
              <AlertDescription>
                Could not load a practice from the API. Make sure the FastAPI
                backend is running and seeded (<code>python seed.py</code>), then
                refresh.
              </AlertDescription>
            </Alert>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
