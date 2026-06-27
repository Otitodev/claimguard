"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon } from "@hugeicons/core-free-icons";

import { CodeStampRow } from "@/components/code-stamp";
import { StatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import type { ClaimSummary } from "@/lib/types";

const STATUSES = [
  "all",
  "submitted",
  "paid",
  "denied",
  "appealed",
  "resolved",
  "written_off",
];

const SOURCES = [
  { value: "all", label: "All sources" },
  { value: "email", label: "Email" },
  { value: "upload", label: "Upload" },
];

export function ClaimsTable({ claims }: { claims: ClaimSummary[] }) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");

  const filtered = claims.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (source === "email" && !c.received_via_email) return false;
    if (source === "upload" && c.received_via_email) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : titleCase(s)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "claim" : "claims"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Date of Service</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>CPT</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                onClick={() => router.push(`/claims/${c.id}`)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{c.patient_name}</span>
                    {c.received_via_email ? (
                      <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-primary">
                        <HugeiconsIcon icon={Mail01Icon} className="size-3" />
                        Email
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatDate(c.date_of_service)}
                </TableCell>
                <TableCell>{c.payer_name}</TableCell>
                <TableCell>
                  <CodeStampRow codes={c.cpt_codes} />
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(c.billed_amount)}
                </TableCell>
                <TableCell>
                  <StatusBadge value={c.status} kind="claim" />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No claims match this filter.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
