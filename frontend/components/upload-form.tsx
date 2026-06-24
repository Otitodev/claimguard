"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  CloudUploadIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { uploadClaim } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UploadResult } from "@/lib/types";

type Phase = "idle" | "processing" | "done" | "error";

const STEPS = ["Uploaded", "Parsing EOB", "Classifying denial"] as const;

export function UploadForm({ practiceId }: { practiceId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setPhase("error");
      return;
    }
    setFileName(file.name);
    setResult(null);
    setPhase("processing");
    try {
      const res = await uploadClaim(practiceId, file);
      setResult(res);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setFileName(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (phase === "done" && result) {
    const r = result.result;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="size-5 text-status-recovered"
              />
              <CardTitle>Processed</CardTitle>
            </div>
            <StatusBadge value={r.classification} kind="classification" />
          </div>
          <CardDescription>
            {result.claim.patient_name} · {result.claim.payer_name}
            {r.already_existed ? " · already on file (idempotent)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {r.reason_summary}
          </p>
          {r.appeal_drafted ? (
            <p className="text-sm text-muted-foreground">
              An appeal letter was drafted automatically.
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="gap-2">
          <Button asChild>
            <Link href={`/claims/${r.claim_id}`}>
              Open claim
              <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
            </Link>
          </Button>
          <Button variant="outline" onClick={reset}>
            Upload another
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (phase === "processing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing {fileName}</CardTitle>
          <CardDescription>Running the denial pipeline…</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              {i === STEPS.length - 1 ? (
                <Spinner className="text-primary" />
              ) : (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-4 text-status-recovered"
                />
              )}
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <HugeiconsIcon icon={CloudUploadIcon} className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              Drop an EOB / denial PDF here, or click to browse
            </span>
            <span className="text-sm text-muted-foreground">
              PDF only · processed through parse → classify → draft
            </span>
          </div>
          {phase === "error" ? (
            <span className="flex items-center gap-1 text-sm text-status-denied">
              <HugeiconsIcon icon={File01Icon} className="size-4" />
              Upload failed — make sure it’s a PDF and the backend is running.
            </span>
          ) : null}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </CardContent>
    </Card>
  );
}
