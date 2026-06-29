/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute, notFound, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, FileText, AlertTriangle, Check, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/supabase";
import { toast } from "sonner";
import { normalizeCRMRecord, type CRMRecordView, type RawCRMRecord } from "@/lib/crm-records";

export const Route = createFileRoute("/crm/$id")({
  loader: async ({ params }) => {
    const res = await fetch(`${API_BASE_URL}/api/crm/${params.id}`);
    if (!res.ok) throw notFound();
    const record = normalizeCRMRecord((await res.json()) as RawCRMRecord);
    return { record };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.record.accountName ?? "Record"} - SKYNET CRM` }],
  }),
  component: CRMDetail,
});

const healthTone = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

const syncStatusLabel = {
  synced: "Synced",
  pending: "Pending",
  failed: "Failed",
} as const;

function CRMDetail() {
  const { record } = Route.useLoaderData() as { record: CRMRecordView };
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${record.id}/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Sync failed: ${res.statusText}`);
      }
      toast.success("CRM synchronized to Notion successfully!");
      router.invalidate();
    } catch (err: any) {
      console.error(err);
      toast.error("CRM sync failed", {
        description: err.message || "Unknown error occurred.",
      });
      router.invalidate();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link
          to="/crm"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to records
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{record.accountName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{record.company}</span>
                <span>|</span>
                <span>{record.leadStage}</span>
                <span>|</span>
                <span>Last contacted {record.lastContacted}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    healthTone[record.healthTone],
                  )}
                >
                  {record.healthStatus}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
              disabled={isSyncing}
              onClick={handleSync}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isSyncing && "animate-spin")} />
              {record.syncStatus === "synced" ? "Re-sync to Notion" : "Sync to Notion"}
            </Button>
            <Button
              size="sm"
              className="rounded-lg"
              disabled={!record.notionPageId}
              onClick={() => {
                if (record.notionPageId) {
                  window.open(`https://notion.so/${record.notionPageId.replace(/-/g, "")}`, "_blank");
                }
              }}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in Notion
            </Button>
          </div>
        </div>

        {record.syncStatus === "failed" && (
          <div className="glass-panel mt-6 flex items-start gap-3 rounded-2xl border-destructive/20 bg-destructive/5 p-5 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="w-full space-y-1.5">
              <div className="font-semibold text-destructive">Sync failure detected</div>
              <div className="text-xs leading-relaxed text-muted-foreground">
                {record.errorMessage || "An unknown error occurred during sync."}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Summary" className="lg:col-span-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {record.summary || "No summary is available for this CRM record yet."}
            </p>
          </Card>

          <Card title="Sync status">
            <div className="space-y-3">
              <Row
                label="CRM"
                value={syncStatusLabel[record.syncStatus]}
                tone={record.syncStatus === "synced" ? "success" : undefined}
              />
              <Row
                label="Notion"
                value={record.notionPageId ? "Connected" : "Not synced"}
                tone={record.notionPageId ? "success" : undefined}
              />
              <Row label="Last sync" value={record.lastContacted} />
            </div>
          </Card>

          <Card title="CRM snapshot" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact / Account" value={record.accountName} />
              <Field label="Company Profile" value={record.company} />
              <Field label="Internal Owner" value={record.internalOwner} />
              <Field label="Lead Stage" value={record.leadStage} />
              <Field label="Activity / Health" value={record.healthStatus} />
              <Field label="Last Contacted" value={record.lastContacted} />
            </div>
          </Card>

          <Card title="Source record">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-2 text-sm font-medium">{record.sourceDocument}</div>
              <div className="mt-1 text-xs text-muted-foreground">{record.sourceType}</div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg"
                disabled={!record.fileUrl}
                onClick={() => {
                  if (record.fileUrl) window.open(record.fileUrl, "_blank");
                }}
              >
                View original
              </Button>
            </div>
          </Card>

          <Card title="Relationship signals" className="lg:col-span-3">
            {record.issues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" /> No issues detected
              </div>
            ) : (
              <ul className="space-y-2">
                {record.issues.map((issue) => (
                  <li
                    key={issue}
                    className="glass-panel flex items-start gap-2 rounded-lg p-3 text-sm"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass-panel rounded-2xl p-5", className)}>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", tone === "success" && "text-success")}>{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
