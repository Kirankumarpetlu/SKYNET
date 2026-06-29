"use client";
import { AlertTriangle, AlertCircle, Info, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const groups = [
  {
    key: "critical" as const,
    label: "Critical",
    icon: AlertCircle,
    tone: "text-destructive bg-destructive/10",
  },
  {
    key: "warning" as const,
    label: "Warning",
    icon: AlertTriangle,
    tone: "text-warning-foreground bg-warning/15",
  },
  { key: "info" as const, label: "Info", icon: Info, tone: "text-primary bg-primary/10" },
];

interface AnomalyItem {
  id: string;
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info" | string;
  document_name?: string;
}

export function AnomalyCard({ anomalies = [] }: { anomalies?: AnomalyItem[] }) {
  const [expanded, setExpanded] = useState<string | null>("critical");

  const grouped = {
    critical: anomalies.filter((a) => a.severity === "critical"),
    warning: anomalies.filter((a) => a.severity === "warning"),
    info: anomalies.filter(
      (a) => a.severity === "info" || (a.severity !== "critical" && a.severity !== "warning"),
    ),
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Anomalies & Issues</h3>
        <p className="text-xs text-muted-foreground">Grouped by severity</p>
      </div>
      <div className="space-y-2">
        {groups.map((g) => {
          const items = grouped[g.key];
          const open = expanded === g.key;
          return (
            <div key={g.key} className="overflow-hidden rounded-xl border border-border">
              <button
                onClick={() => setExpanded(open ? null : g.key)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn("flex h-7 w-7 items-center justify-center rounded-lg", g.tone)}
                  >
                    <g.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium">{g.label}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <ul className="space-y-2 border-t border-border bg-muted/20 px-3 py-2.5">
                      {items.length === 0 && (
                        <li className="py-2 text-center text-xs text-muted-foreground">No items</li>
                      )}
                      {items.map((it) => (
                        <li key={it.id} className="text-xs">
                          <div className="font-medium">{it.title}</div>
                          <div className="text-muted-foreground">{it.detail}</div>
                          {it.document_name && (
                            <div className="mt-0.5 text-[10px] text-muted-foreground italic">
                              Doc: {it.document_name}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
