/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { motion } from "framer-motion";
import { ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RiskCard } from "@/components/cards/risk-card";
import { AnomalyCard } from "@/components/cards/anomaly-card";
import { cn } from "@/lib/utils";

interface Props {
  projectName?: string;
  riskScore?: number;
  riskBreakdown?: { legal: number; financial: number; operational: number };
  documents?: any[];
  anomalies?: any[];
  activity?: { message: string; time: string }[];
  inline?: boolean;
}

export function InsightsPanel({
  projectName,
  riskScore = 0,
  riskBreakdown,
  documents = [],
  anomalies = [],
  activity = [],
  inline = false,
}: Props) {
  const [open, setOpen] = useState(true);

  const documentCount = documents.length;
  const processingCount = documents.filter((d) => d.status === "processing").length;
  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
  const warningCount = anomalies.filter((a) => a.severity === "warning").length;

  const formattedBreakdown = riskBreakdown
    ? [
        { label: "Legal", value: riskBreakdown.legal || 0 },
        { label: "Financial", value: riskBreakdown.financial || 0 },
        { label: "Operational", value: riskBreakdown.operational || 0 },
      ]
    : undefined;

  if (inline) {
    return (
      <div className="space-y-4 p-4 w-full">
        <RiskCard score={riskScore} breakdown={formattedBreakdown} />
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Documents" value={documentCount} />
          <Stat label="Processing" value={processingCount} hint="in pipeline" />
          <Stat label="Critical" value={criticalCount} tone="destructive" />
          <Stat label="Warnings" value={warningCount} tone="warning" />
        </div>
        <AnomalyCard anomalies={anomalies} />
      </div>
    );
  }

  return (
    <>
      {!open && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="glass-card absolute right-3 top-3 z-10 h-8 w-8 rounded-lg shadow-sm"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}
      <motion.aside
        animate={{ width: open ? 360 : 0, opacity: open ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        className={cn(
          "glass-sidebar hidden h-full shrink-0 overflow-hidden lg:block",
        )}
      >
        <div className="flex h-full w-[360px] flex-col">
          <div className="glass-header flex h-14 items-center justify-between px-4">
            <div>
              <div className="text-sm font-semibold">Project Insights</div>
              {projectName && (
                <div className="truncate text-[11px] text-muted-foreground">{projectName}</div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4">
            <RiskCard score={riskScore} breakdown={formattedBreakdown} />

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Documents" value={documentCount} />
              <Stat label="Processing" value={processingCount} hint="in pipeline" />
              <Stat label="Critical" value={criticalCount} tone="destructive" />
              <Stat label="Warnings" value={warningCount} tone="warning" />
            </div>

            <AnomalyCard anomalies={anomalies} />

            <div className="glass-panel rounded-2xl p-4">
              <h3 className="mb-2 text-sm font-semibold">Recent Activity</h3>
              {activity && activity.length > 0 ? (
                <ul className="space-y-2.5">
                  {activity.map((a, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1">{a.message}</span>
                      <span className="text-[11px] text-muted-foreground">{a.time}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-2 text-xs text-muted-foreground">
                  No recent activity.
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "destructive" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold",
          tone === "destructive" && "text-destructive",
          tone === "warning" && "text-warning-foreground",
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
