"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiMagicIcon,
  Download01Icon,
  FileDownloadIcon,
} from "@hugeicons/core-free-icons";

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
import { RichEditor } from "@/components/rich-editor";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { downloadAppeal, redraftAppeal, updateAppeal } from "@/lib/api";
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
  const [downloading, setDownloading] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const terminal = appeal.status === "won" || appeal.status === "lost";

  async function regenerate() {
    if (
      text !== (appeal.letter_text ?? "") &&
      !window.confirm(
        "Regenerating will replace the current letter, including unsaved edits. Continue?",
      )
    ) {
      return;
    }
    setRegenerating(true);
    try {
      const { letter_text } = await redraftAppeal(appeal.id, {
        instruction: instruction.trim() || undefined,
      });
      setText(letter_text);
      toast.success("New draft generated — review and save");
    } catch {
      toast.error("Could not regenerate the appeal letter");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDownload(format: "pdf" | "doc") {
    setDownloading(format);
    try {
      await downloadAppeal(appeal.id, format);
    } catch {
      toast.error(`Could not download ${format.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  }

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
      <CardContent className="flex flex-col gap-3">
        <RichEditor
          content={text}
          onUpdate={setText}
          disabled={terminal}
        />
        {!terminal ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={regenerating}
              rows={2}
              placeholder="Optional: tell the AI how to redraft — e.g. “make it more assertive” or “emphasize the prior authorization”"
              className="resize-none bg-background"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Generates a fresh draft for you to review — nothing is saved until
                you click “Save letter”.
              </span>
              <Button
                variant="outline"
                onClick={regenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <HugeiconsIcon icon={AiMagicIcon} data-icon="inline-start" />
                )}
                {regenerating ? "Regenerating…" : "Regenerate"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={save}
            disabled={terminal || saving || text === (appeal.letter_text ?? "")}
          >
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {saving ? "Saving…" : "Save letter"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownload("pdf")}
            disabled={downloading !== null}
          >
            {downloading === "pdf" ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon icon={Download01Icon} data-icon="inline-start" />
            )}
            {downloading === "pdf" ? "Downloading…" : "PDF"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownload("doc")}
            disabled={downloading !== null}
          >
            {downloading === "doc" ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon icon={FileDownloadIcon} data-icon="inline-start" />
            )}
            {downloading === "doc" ? "Downloading…" : "DOC"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {appeal.status === "drafted" ? (
            <Button onClick={() => setStatus("submitted")} disabled={busy !== null}>
              {busy === "submitted" ? <Spinner data-icon="inline-start" /> : null}
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
                {busy === "lost" ? <Spinner data-icon="inline-start" /> : null}
                {busy === "lost" ? "Marking…" : "Mark lost"}
              </Button>
              <Button onClick={() => setStatus("won")} disabled={busy !== null}>
                {busy === "won" ? <Spinner data-icon="inline-start" /> : null}
                {busy === "won" ? "Marking…" : "Mark won"}
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
