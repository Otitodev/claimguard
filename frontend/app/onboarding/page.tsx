import { redirect } from "next/navigation";

import { Logo } from "@/components/marketing/logo";
import { PracticeForm } from "@/components/practice-form";
import { defaultPractice } from "@/lib/api-server";

// Lives outside the (app) route group so the layout's "incomplete profile"
// redirect can't loop back into itself.
export default async function OnboardingPage() {
  const practice = await defaultPractice();
  if (!practice) {
    // No reachable practice (e.g. backend down) — fall back to the dashboard,
    // which surfaces the "backend not reachable" alert.
    redirect("/dashboard");
  }
  // Already onboarded? Don't make them redo it.
  if (practice.profile_complete) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/30 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo className="h-8" />
        <h1 className="text-xl font-semibold">Set up your practice</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We use these details as the letterhead and signature on every appeal
          letter ClaimGuard drafts for you. It takes about a minute.
        </p>
      </div>
      <PracticeForm initial={practice} mode="onboarding" />
    </div>
  );
}
