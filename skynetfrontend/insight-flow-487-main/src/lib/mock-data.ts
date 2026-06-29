export type ProjectStatus = "active" | "processing" | "completed" | "archived";
export type DocumentStatus = "uploaded" | "processing" | "completed" | "failed";
export type RiskLevel = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  documentCount: number;
  updatedAt: string;
  riskScore: number;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: "pdf" | "docx" | "xlsx" | "png" | "jpg";
  size: string;
  status: DocumentStatus;
  uploadedAt: string;
  projectId: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface CRMRecord {
  id: string;
  document: string;
  vendor: string;
  customer: string;
  type: string;
  risk: RiskLevel;
  status: "synced" | "pending" | "failed";
  processedDate: string;
  summary: string;
  issues: string[];
}

export interface Notification {
  id: string;
  type: "upload" | "risk" | "crm" | "comparison";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const mockProjects: Project[] = [
  {
    id: "p1",
    name: "Vendor Contract — Acme Corp",
    description: "Master service agreement with payment terms review",
    status: "active",
    documentCount: 8,
    updatedAt: "2 hours ago",
    riskScore: 72,
  },
  {
    id: "p2",
    name: "Microsoft NDA",
    description: "Mutual non-disclosure for partnership discussions",
    status: "completed",
    documentCount: 3,
    updatedAt: "Yesterday",
    riskScore: 18,
  },
  {
    id: "p3",
    name: "Q3 Invoices Audit",
    description: "Cross-vendor invoice reconciliation",
    status: "processing",
    documentCount: 42,
    updatedAt: "5 min ago",
    riskScore: 45,
  },
  {
    id: "p4",
    name: "Financial Statements 2024",
    description: "Annual financial review and risk assessment",
    status: "active",
    documentCount: 12,
    updatedAt: "3 days ago",
    riskScore: 31,
  },
  {
    id: "p5",
    name: "SaaS Subscription Agreements",
    description: "Renewal review across vendor portfolio",
    status: "archived",
    documentCount: 17,
    updatedAt: "2 weeks ago",
    riskScore: 56,
  },
];

export const mockDocuments: DocumentFile[] = [
  {
    id: "d1",
    name: "MSA_Acme_2024_Final.pdf",
    type: "pdf",
    size: "2.4 MB",
    status: "completed",
    uploadedAt: "2h ago",
    projectId: "p1",
  },
  {
    id: "d2",
    name: "Statement_of_Work_01.docx",
    type: "docx",
    size: "812 KB",
    status: "completed",
    uploadedAt: "2h ago",
    projectId: "p1",
  },
  {
    id: "d3",
    name: "Pricing_Schedule.xlsx",
    type: "xlsx",
    size: "156 KB",
    status: "processing",
    uploadedAt: "1h ago",
    projectId: "p1",
  },
  {
    id: "d4",
    name: "Amendment_2.pdf",
    type: "pdf",
    size: "1.1 MB",
    status: "completed",
    uploadedAt: "2h ago",
    projectId: "p1",
  },
];

export const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "Summarize the key payment terms in this contract.",
    timestamp: "10:24 AM",
  },
  {
    id: "m2",
    role: "assistant",
    content: `Here are the **key payment terms** from the Acme MSA:

- **Net 45 days** from invoice receipt
- **Late fee:** 1.5% per month on overdue balances
- **Currency:** USD, wire transfer preferred
- **Disputes** must be raised within 30 days

| Term | Value |
|------|-------|
| Payment window | 45 days |
| Late fee | 1.5%/mo |
| Dispute period | 30 days |

⚠️ The 1.5% monthly late fee is above industry standard (typically 1.0%).`,
    timestamp: "10:24 AM",
  },
];

export const mockCRMRecords: CRMRecord[] = [
  {
    id: "c1",
    document: "MSA_Acme_2024_Final.pdf",
    vendor: "Acme Corp",
    customer: "Internal — Procurement",
    type: "Master Agreement",
    risk: "high",
    status: "synced",
    processedDate: "Mar 14, 2025",
    summary: "Multi-year MSA with auto-renewal and elevated late-fee structure.",
    issues: [
      "Above-market late fee (1.5%/mo)",
      "Auto-renewal without 60-day notice",
      "Broad indemnification clause",
    ],
  },
  {
    id: "c2",
    document: "MS_NDA_Mutual.pdf",
    vendor: "Microsoft",
    customer: "Internal — Legal",
    type: "NDA",
    risk: "low",
    status: "synced",
    processedDate: "Mar 12, 2025",
    summary: "Standard mutual NDA, 3-year term, no unusual provisions.",
    issues: [],
  },
  {
    id: "c3",
    document: "Invoice_Q3_Batch.xlsx",
    vendor: "Multiple",
    customer: "Finance",
    type: "Invoice Batch",
    risk: "medium",
    status: "pending",
    processedDate: "Mar 10, 2025",
    summary: "42 invoices reconciled, 3 amount mismatches detected.",
    issues: ["3 invoices exceed PO amount", "1 duplicate invoice number"],
  },
  {
    id: "c4",
    document: "FY2024_10K.pdf",
    vendor: "Internal",
    customer: "Board",
    type: "Financial Filing",
    risk: "low",
    status: "synced",
    processedDate: "Mar 8, 2025",
    summary: "Annual report cross-checked with quarterly statements.",
    issues: [],
  },
  {
    id: "c5",
    document: "SaaS_Renewal_Notion.pdf",
    vendor: "Notion Labs",
    customer: "IT",
    type: "Subscription",
    risk: "medium",
    status: "failed",
    processedDate: "Mar 5, 2025",
    summary: "Renewal at 22% price increase, alternative vendors recommended.",
    issues: ["22% price increase YoY", "Locked into 3-year commitment"],
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "n1",
    type: "risk",
    title: "High risk detected",
    message: "Acme MSA contains elevated indemnification scope",
    time: "5m ago",
    read: false,
  },
  {
    id: "n2",
    type: "upload",
    title: "Upload complete",
    message: "4 documents processed in Vendor Contract",
    time: "1h ago",
    read: false,
  },
  {
    id: "n3",
    type: "crm",
    title: "CRM synced",
    message: "Microsoft NDA pushed to records",
    time: "3h ago",
    read: true,
  },
  {
    id: "n4",
    type: "comparison",
    title: "Comparison ready",
    message: "MSA v1 vs v2 diff is available",
    time: "Yesterday",
    read: true,
  },
];

export const processingStages = [
  { id: "upload", label: "Upload", description: "Receiving files" },
  { id: "ocr", label: "OCR", description: "Extracting text from documents" },
  { id: "classification", label: "Classification", description: "Identifying document types" },
  { id: "entity", label: "Entity Extraction", description: "Detecting parties, dates, amounts" },
  { id: "clause", label: "Clause Extraction", description: "Mapping legal clauses" },
  { id: "risk", label: "Risk Analysis", description: "Scoring contractual risk" },
  { id: "comparison", label: "Cross-Document Comparison", description: "Detecting contradictions" },
  { id: "crm", label: "CRM Sync", description: "Pushing to records" },
] as const;

export const suggestedPrompts = [
  "Summarize this contract",
  "Find payment terms",
  "Explain the termination clause",
  "Compare invoices across vendors",
  "Show me the top risks",
];

export const mockClauses = [
  {
    id: "cl1",
    title: "Payment Terms",
    summary: "Net 45 with 1.5%/mo late fee",
    risk: "medium" as RiskLevel,
  },
  {
    id: "cl2",
    title: "Termination",
    summary: "Either party with 90 days written notice",
    risk: "low" as RiskLevel,
  },
  {
    id: "cl3",
    title: "Confidentiality",
    summary: "Mutual, surviving 5 years post-termination",
    risk: "low" as RiskLevel,
  },
  {
    id: "cl4",
    title: "Intellectual Property",
    summary: "Customer retains pre-existing IP; work product assigned",
    risk: "low" as RiskLevel,
  },
  {
    id: "cl5",
    title: "Liability",
    summary: "Capped at 12 months fees; carve-outs for IP/confidentiality",
    risk: "medium" as RiskLevel,
  },
  {
    id: "cl6",
    title: "Non-Compete",
    summary: "24-month restriction on direct competitors",
    risk: "high" as RiskLevel,
  },
];

export const mockAnomalies = {
  critical: [
    {
      id: "a1",
      title: "Conflicting termination dates",
      detail: "MSA states 90 days, Amendment 2 says 30 days.",
    },
  ],
  warning: [
    {
      id: "a2",
      title: "Auto-renewal without notice window",
      detail: "No explicit notice requirement before renewal.",
    },
    { id: "a3", title: "Late fee above market", detail: "1.5%/mo vs 1.0% industry standard." },
  ],
  info: [
    {
      id: "a4",
      title: "Governing law mismatch",
      detail: "MSA uses Delaware; SOW references California.",
    },
  ],
};
