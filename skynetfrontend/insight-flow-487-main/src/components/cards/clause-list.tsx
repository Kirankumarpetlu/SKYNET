"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { type RiskLevel } from "@/lib/mock-data";

const riskTone: Record<RiskLevel, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/15 text-warning-foreground",
  high: "bg-destructive/10 text-destructive",
};

interface ClauseItem {
  id: string;
  title: string;
  summary: string;
  risk: RiskLevel | string;
  text?: string;
  document_name?: string;
}

export function ClauseList({ clauses = [] }: { clauses?: ClauseItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (clauses.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No clauses extracted yet. Upload a document to start.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {clauses.map((c) => {
        const isOpen = open === c.id;
        const toneKey = (c.risk || "low").toLowerCase() as RiskLevel;
        return (
          <div key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              onClick={() => setOpen(isOpen ? null : c.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.title}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
                      riskTone[toneKey] || riskTone.low,
                    )}
                  >
                    {c.risk}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.summary}</div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Extracted text:</span>{" "}
                      <em className="text-foreground/80">
                        "{c.text || "No text content available."}"
                      </em>
                    </p>
                    {c.document_name && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Source document:{" "}
                        <span className="font-medium text-foreground">{c.document_name}</span>
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
