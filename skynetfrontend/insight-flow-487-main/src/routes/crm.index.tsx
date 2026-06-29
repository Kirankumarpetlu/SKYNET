import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Database, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import { useCRMRecords } from "@/hooks/use-projects";
import type { CRMLeadStage, CRMRecordView } from "@/lib/crm-records";

export const Route = createFileRoute("/crm/")({
  head: () => ({
    meta: [
      { title: "CRM Records - SKYNET" },
      {
        name: "description",
        content: "Customer relationship records generated from processed source documents.",
      },
    ],
  }),
  component: CRMPage,
});

const leadStageTone: Record<CRMLeadStage, string> = {
  "New Lead": "bg-muted text-foreground",
  Contacted: "bg-primary/10 text-primary",
  Qualified: "bg-success/10 text-success",
};

const healthTone = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

function CRMPage() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [company, setCompany] = useState<string>("all");
  const { data: records = [], isLoading, isError, refetch } = useCRMRecords();

  const companies = Array.from(new Set(records.map((r: CRMRecordView) => r.company)));

  const filtered = records.filter((record: CRMRecordView) => {
    if (q) {
      const query = q.toLowerCase();
      const matchesQuery =
        record.accountName.toLowerCase().includes(query) ||
        record.company.toLowerCase().includes(query) ||
        record.internalOwner.toLowerCase().includes(query) ||
        record.sourceDocument.toLowerCase().includes(query);

      if (!matchesQuery) return false;
    }

    if (stage !== "all" && record.leadStage !== stage) return false;
    if (company !== "all" && record.company !== company) return false;
    return true;
  });

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM Records</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact and account records arranged around company, stage, relationship health, and
            recent activity.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search accounts..."
              className="h-9 rounded-lg bg-card/60 backdrop-blur-md border-border/60 pl-8"
            />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 w-[160px] rounded-lg bg-card/60 backdrop-blur-md border-border/60">
              <SelectValue placeholder="Lead stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem value="New Lead">New Lead</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Qualified">Qualified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 w-[200px] rounded-lg bg-card/60 backdrop-blur-md border-border/60">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading records...</p>
          </div>
        ) : isError ? (
          <div className="mt-16 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive">Failed to load records.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="glass-panel mt-6 overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Contact / Account</th>
                  <th className="px-4 py-3">Company Profile</th>
                  <th className="px-4 py-3">Lead Stage</th>
                  <th className="px-4 py-3">Activity / Health</th>
                  <th className="px-4 py-3">Last Contacted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record: CRMRecordView) => (
                  <tr
                    key={record.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        to="/crm/$id"
                        params={{ id: record.id }}
                        className="font-medium hover:text-primary"
                      >
                        {record.accountName}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Source: {record.sourceDocument}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div>{record.company}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Owner: {record.internalOwner}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          leadStageTone[record.leadStage],
                        )}
                      >
                        {record.leadStage}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          healthTone[record.healthTone],
                        )}
                      >
                        {record.healthStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {record.lastContacted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Database}
            title="No records match"
            description="Try adjusting your filters or search."
          />
        )}
      </div>
    </div>
  );
}
