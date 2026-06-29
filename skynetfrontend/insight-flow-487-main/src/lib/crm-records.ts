import type { RiskLevel } from "@/lib/mock-data";

export type CRMSyncStatus = "synced" | "pending" | "failed";
export type CRMLeadStage = "New Lead" | "Contacted" | "Qualified";
export type CRMHealthTone = "success" | "warning" | "destructive" | "muted";

export interface RawCRMRecord {
  id: string;
  document: string;
  vendor: string;
  customer: string;
  type: string;
  risk: RiskLevel;
  status: CRMSyncStatus;
  processedDate: string;
  summary: string;
  issues: string[];
  notion_page_id?: string | null;
  error_message?: string | null;
  file_url?: string | null;
}

export interface CRMRecordView {
  id: string;
  accountName: string;
  company: string;
  internalOwner: string;
  leadStage: CRMLeadStage;
  healthStatus: string;
  healthTone: CRMHealthTone;
  lastContacted: string;
  summary: string;
  issues: string[];
  syncStatus: CRMSyncStatus;
  sourceDocument: string;
  sourceType: string;
  risk: RiskLevel;
  notionPageId: string | null;
  errorMessage: string | null;
  fileUrl: string | null;
}

function normalizeDocumentName(name: string) {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  return withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCompany(value: string | undefined, fallback: string) {
  if (!value || value === "N/A" || value === "Internal") {
    return fallback;
  }
  return value;
}

function deriveLeadStage(status: CRMSyncStatus): CRMLeadStage {
  if (status === "synced") return "Qualified";
  if (status === "pending") return "Contacted";
  return "New Lead";
}

function deriveHealth(
  status: CRMSyncStatus,
  risk: RiskLevel,
  issueCount: number,
): Pick<CRMRecordView, "healthStatus" | "healthTone"> {
  if (status === "failed") {
    return { healthStatus: "Needs Attention", healthTone: "destructive" };
  }
  if (issueCount > 0 || risk === "high") {
    return { healthStatus: "At Risk", healthTone: "warning" };
  }
  if (status === "pending") {
    return { healthStatus: "Awaiting Follow-up", healthTone: "muted" };
  }
  return { healthStatus: "Active", healthTone: "success" };
}

export function normalizeCRMRecord(raw: RawCRMRecord): CRMRecordView {
  const fallbackName = normalizeDocumentName(raw.document) || "Untitled Account";
  const company = normalizeCompany(raw.vendor, fallbackName);
  const internalOwner =
    raw.customer && raw.customer !== "Internal" ? raw.customer : "Internal Team";
  const accountName =
    raw.vendor && raw.vendor !== "N/A" ? `${raw.vendor} Account` : `${fallbackName} Account`;
  const leadStage = deriveLeadStage(raw.status);
  const health = deriveHealth(raw.status, raw.risk, raw.issues.length);

  return {
    id: raw.id,
    accountName,
    company,
    internalOwner,
    leadStage,
    healthStatus: health.healthStatus,
    healthTone: health.healthTone,
    lastContacted: raw.processedDate,
    summary: raw.summary,
    issues: raw.issues,
    syncStatus: raw.status,
    sourceDocument: raw.document,
    sourceType: raw.type,
    risk: raw.risk,
    notionPageId: raw.notion_page_id ?? null,
    errorMessage: raw.error_message ?? null,
    fileUrl: raw.file_url ?? null,
  };
}
