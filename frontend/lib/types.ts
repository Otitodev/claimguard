// Mirrors the FastAPI response schemas (backend/app/schemas.py).
// Money fields are serialized as strings (Pydantic Decimal -> JSON string).

export type Classification = "resubmit" | "appeal" | "write_off";

export type ClaimStatus =
  | "submitted"
  | "paid"
  | "partially_paid"
  | "denied"
  | "appealed"
  | "resolved"
  | "written_off";

export type AppealStatus = "drafted" | "submitted" | "won" | "lost" | "pending";

export interface Practice {
  id: string;
  name: string;
}

export interface ClaimSummary {
  id: string;
  patient_name: string;
  date_of_service: string | null;
  payer_name: string;
  cpt_codes: string[];
  billed_amount: string | null;
  status: ClaimStatus;
}

export interface DenialOut {
  id: string;
  denial_code: string | null;
  denied_amount: string | null;
  denial_date: string | null;
  appeal_deadline: string | null;
  ai_reason_summary: string | null;
  ai_classification: Classification | null;
}

export interface AppealOut {
  id: string;
  denial_id: string;
  letter_text: string | null;
  status: AppealStatus;
  submitted_date: string | null;
  outcome_date: string | null;
  recovered_amount: string | null;
}

export interface ActivityOut {
  id: string;
  action_type: string;
  actor: "ai" | "user";
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ClaimDetail {
  id: string;
  patient_name: string;
  date_of_service: string | null;
  payer_name: string;
  cpt_codes: string[];
  icd_codes: string[];
  billed_amount: string | null;
  status: ClaimStatus;
  denials: DenialOut[];
  appeals: AppealOut[];
  activity: ActivityOut[];
}

export interface NeedsActionItem {
  appeal_id: string;
  denial_id: string;
  claim_id: string;
  patient_name: string;
  payer_name: string;
  denial_code: string | null;
  denied_amount: string | null;
  appeal_deadline: string | null;
  days_remaining: number | null;
  kind: "deadline" | "overdue";
  submitted_date: string | null;
  expected_response_date: string | null;
  days_since_submission: number | null;
}

export interface PayerRate {
  payer_name: string;
  total_claims: number;
  denied_claims: number;
  denial_rate: number;
}

export interface CategoryRisk {
  category: string | null;
  revenue_at_risk: string;
}

export interface AnalyticsSummary {
  total_claims: number;
  denial_rate: number;
  denial_rate_window: string;
  revenue_at_risk: string;
  revenue_recovered_this_month: string;
  denial_rate_by_payer: PayerRate[];
  revenue_at_risk_by_category: CategoryRisk[];
  appeals_in_progress: number;
  avg_days_to_resolution: number | null;
}

export interface UploadResult {
  result: {
    claim_id: string;
    denial_id: string;
    classification: Classification;
    reason_summary: string;
    appeal_drafted: boolean;
    already_existed: boolean;
  };
  claim: ClaimDetail;
}
