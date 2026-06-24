import { EmailIntakeCard } from "@/components/email-intake-card";
import { PracticeForm } from "@/components/practice-form";
import { defaultPractice } from "@/lib/api-server";

export default async function SettingsPage() {
  const practice = await defaultPractice();
  if (!practice) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage the practice details that appear on your appeal letters.
        </p>
      </div>
      <PracticeForm initial={practice} mode="settings" />
      <EmailIntakeCard address={practice.agentmail_address} />
    </div>
  );
}
