"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePractice } from "@/lib/api";
import type { AppealTone, Practice, PracticeUpdate } from "@/lib/types";

type Mode = "onboarding" | "settings";

// Keys we collect; mirrors PracticeUpdate (all optional strings on the wire).
type FormState = {
  name: string;
  phone: string;
  fax: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  npi: string;
  tax_id: string;
  primary_provider_name: string;
  primary_provider_credentials: string;
  specialty: string;
  default_appeal_tone: AppealTone;
};

// Must match PROFILE_REQUIRED_FIELDS in backend/app/schemas.py.
const REQUIRED: (keyof FormState)[] = [
  "address_line1",
  "city",
  "state",
  "zip_code",
  "phone",
  "npi",
  "primary_provider_name",
];

const TONES: { value: AppealTone; label: string }[] = [
  { value: "formal", label: "Formal — professional and measured" },
  { value: "assertive", label: "Assertive — firm on the payer's obligations" },
  { value: "concise", label: "Concise — short and to the point" },
];

function init(p: Practice): FormState {
  return {
    name: p.name ?? "",
    phone: p.phone ?? "",
    fax: p.fax ?? "",
    address_line1: p.address_line1 ?? "",
    address_line2: p.address_line2 ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    zip_code: p.zip_code ?? "",
    npi: p.npi ?? "",
    tax_id: p.tax_id ?? "",
    primary_provider_name: p.primary_provider_name ?? "",
    primary_provider_credentials: p.primary_provider_credentials ?? "",
    specialty: p.specialty ?? "",
    default_appeal_tone: p.default_appeal_tone ?? "formal",
  };
}

function Field({
  id,
  label,
  value,
  onChange,
  required = false,
  placeholder,
  className,
}: {
  id: keyof FormState;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-status-denied"> *</span> : null}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function PracticeForm({
  initial,
  mode,
}: {
  initial: Practice;
  mode: Mode;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => init(initial));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function missingRequired(): (keyof FormState)[] {
    return REQUIRED.filter((k) => !form[k].trim());
  }

  async function submit() {
    const missing = missingRequired();
    if (missing.length) {
      toast.error("Please fill in all required fields before continuing.");
      return;
    }
    setSaving(true);
    try {
      await updatePractice(form as PracticeUpdate);
      if (mode === "onboarding") {
        toast.success("Practice profile saved — you're all set.");
        router.push("/dashboard");
      } else {
        toast.success("Settings saved.");
      }
      router.refresh();
    } catch {
      toast.error("Could not save your practice profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const practiceStep = (
    <div className="flex flex-col gap-4">
      <Field
        id="name"
        label="Practice name"
        value={form.name}
        onChange={set("name")}
        placeholder="Riverside Family Medicine"
      />
      <Field
        id="address_line1"
        label="Street address"
        value={form.address_line1}
        onChange={set("address_line1")}
        required
        placeholder="456 Oak Street, Suite 200"
      />
      <Field
        id="address_line2"
        label="Address line 2"
        value={form.address_line2}
        onChange={set("address_line2")}
        placeholder="(optional)"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Field
          id="city"
          label="City"
          value={form.city}
          onChange={set("city")}
          required
          className="sm:col-span-3"
        />
        <Field
          id="state"
          label="State"
          value={form.state}
          onChange={set("state")}
          required
          placeholder="IL"
          className="sm:col-span-1"
        />
        <Field
          id="zip_code"
          label="ZIP"
          value={form.zip_code}
          onChange={set("zip_code")}
          required
          className="sm:col-span-2"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="phone"
          label="Phone"
          value={form.phone}
          onChange={set("phone")}
          required
          placeholder="(217) 555-0142"
        />
        <Field
          id="fax"
          label="Fax"
          value={form.fax}
          onChange={set("fax")}
          placeholder="(optional)"
        />
      </div>
    </div>
  );

  const providerStep = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          id="primary_provider_name"
          label="Provider name"
          value={form.primary_provider_name}
          onChange={set("primary_provider_name")}
          required
          placeholder="Dr. Sarah Chen"
          className="sm:col-span-2"
        />
        <Field
          id="primary_provider_credentials"
          label="Credentials"
          value={form.primary_provider_credentials}
          onChange={set("primary_provider_credentials")}
          placeholder="MD"
        />
      </div>
      <Field
        id="specialty"
        label="Specialty"
        value={form.specialty}
        onChange={set("specialty")}
        placeholder="Family Medicine"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="npi"
          label="NPI"
          value={form.npi}
          onChange={set("npi")}
          required
          placeholder="1234567890"
        />
        <Field
          id="tax_id"
          label="Tax ID"
          value={form.tax_id}
          onChange={set("tax_id")}
          placeholder="12-3456789"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="default_appeal_tone">Default appeal tone</Label>
        <Select
          value={form.default_appeal_tone}
          onValueChange={(v) => set("default_appeal_tone")(v)}
        >
          <SelectTrigger id="default_appeal_tone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TONES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How the AI drafts appeal letters. You can override this per letter.
        </p>
      </div>
    </div>
  );

  // --- Settings mode: one flat card, no stepper ---
  if (mode === "settings") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practice profile</CardTitle>
          <CardDescription>
            Used as the letterhead and signature on every appeal letter, and to
            set the default drafting tone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {practiceStep}
          {providerStep}
        </CardContent>
        <CardFooter>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // --- Onboarding mode: 3-step wizard ---
  const steps = [
    { title: "Your practice", desc: "Where appeals are sent from." },
    { title: "Provider & identifiers", desc: "The signature and IDs payers expect." },
    { title: "Review", desc: "Confirm and finish setup." },
  ];

  function next() {
    if (step === 0) {
      const stepMissing = (["address_line1", "city", "state", "zip_code", "phone"] as const).filter(
        (k) => !form[k].trim(),
      );
      if (stepMissing.length) {
        toast.error("Please fill in the required address and phone fields.");
        return;
      }
    }
    if (step === 1) {
      const stepMissing = (["primary_provider_name", "npi"] as const).filter(
        (k) => !form[k].trim(),
      );
      if (stepMissing.length) {
        toast.error("Provider name and NPI are required.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  const reviewRow = (label: string, value: string) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );

  const reviewStep = (
    <div className="flex flex-col divide-y">
      {reviewRow("Practice", form.name)}
      {reviewRow(
        "Address",
        [form.address_line1, form.address_line2, `${form.city}, ${form.state} ${form.zip_code}`]
          .filter((s) => s && s.trim() !== ",")
          .join(" · "),
      )}
      {reviewRow("Phone", form.phone)}
      {reviewRow("Fax", form.fax)}
      {reviewRow(
        "Provider",
        [form.primary_provider_name, form.primary_provider_credentials]
          .filter(Boolean)
          .join(", "),
      )}
      {reviewRow("Specialty", form.specialty)}
      {reviewRow("NPI", form.npi)}
      {reviewRow("Tax ID", form.tax_id)}
      {reviewRow(
        "Appeal tone",
        TONES.find((t) => t.value === form.default_appeal_tone)?.label ?? "",
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <CardTitle>{steps[step].title}</CardTitle>
        <CardDescription>
          Step {step + 1} of {steps.length} · {steps[step].desc}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 0 ? practiceStep : step === 1 ? providerStep : reviewStep}
      </CardContent>
      <CardFooter className="justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0 || saving}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={next}>
            Continue
            <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving}>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" />
            {saving ? "Saving…" : "Finish setup"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
