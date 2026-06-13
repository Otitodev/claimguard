"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { updateAppeal } from "@/lib/api";
import type { AppealOut, AppealStatus } from "@/lib/types";

export function AppealPanel({
  appeal,
  deniedAmount,
}: {
  appeal: AppealOut;
  deniedAmount: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(appeal.letter_text ?? "");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<AppealStatus | "save" | null>(null);

  const terminal = appeal.status === "won" || appeal.status === "lost";

  async function save() {
    setSaving(true);
    setBusy("save");
    try {
      await updateAppeal(appeal.id, { letter_text: text });
      toast.success("Appeal letter saved");
      router.refresh();
    } catch {
      toast.error("Could not save the appeal letter");
    } finally {
      setSaving(false);
      setBusy(null);
    }
  }

  async function setStatus(status: AppealStatus) {
    setBusy(status);
    try {
      const payload: Parameters<typeof updateAppeal>[1] = { status };
      if (status === "won" && deniedAmount) payload.recovered_amount = deniedAmount;
      await updateAppeal(appeal.id, payload);
      toast.success(`Appeal marked ${status}`);
      router.refresh();
    } catch {
      toast.error("Could not update the appeal");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Appeal Letter</CardTitle>
            <CardDescription>
              AI-drafted — review and edit before submitting.
            </CardDescription>
          </div>
          <StatusBadge value={appeal.status} kind="appeal" />
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={terminal}
          rows={16}
          className="resize-y font-serif text-sm leading-relaxed"
        />
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2">
        <Button
          variant="outline"
          onClick={save}
          disabled={terminal || saving || text === (appeal.letter_text ?? "")}
        >
          {saving ? "Saving…" : "Save letter"}
        </Button>
        <div className="flex flex-wrap gap-2">
          {appeal.status === "drafted" ? (
            <Button onClick={() => setStatus("submitted")} disabled={busy !== null}>
              {busy === "submitted" ? "Submitting…" : "Mark submitted"}
            </Button>
          ) : null}
          {appeal.status === "submitted" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setStatus("lost")}
                disabled={busy !== null}
              >
                {busy === "lost" ? "…" : "Mark lost"}
              </Button>
              <Button onClick={() => setStatus("won")} disabled={busy !== null}>
                {busy === "won" ? "…" : "Mark won"}
              </Button>
            </>
          ) : null}
          {terminal ? (
            <span className="text-sm text-muted-foreground">
              Appeal {appeal.status}. No further action.
            </span>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}
