"use client";
import { motion } from "framer-motion";
import { Check, Loader2, Circle } from "lucide-react";
import { processingStages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type StageState = "pending" | "running" | "completed" | "failed";

interface Props {
  /** Index of current running stage; everything before is completed */
  current: number;
}

export function ProcessingTimeline({ current }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Processing Pipeline</h3>
          <p className="text-xs text-muted-foreground">Live document intelligence stages</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {current >= processingStages.length ? "Complete" : "Running"}
        </span>
      </div>
      <ol className="relative space-y-3.5">
        {processingStages.map((stage, i) => {
          const state: StageState =
            i < current ? "completed" : i === current ? "running" : "pending";
          return (
            <li key={stage.id} className="relative flex items-start gap-3">
              {/* connector */}
              {i < processingStages.length - 1 && (
                <span
                  className={cn(
                    "absolute left-[11px] top-6 h-[calc(100%-4px)] w-px",
                    i < current ? "bg-success" : "bg-border",
                  )}
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  state === "completed" && "border-success bg-success text-success-foreground",
                  state === "running" && "border-primary bg-primary/10 text-primary",
                  state === "pending" && "border-border bg-card text-muted-foreground",
                )}
              >
                {state === "completed" && <Check className="h-3 w-3" strokeWidth={3} />}
                {state === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                {state === "pending" && <Circle className="h-1.5 w-1.5 fill-current" />}
              </div>
              <div className="min-w-0 flex-1 pt-px">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      state === "pending" && "text-muted-foreground",
                    )}
                  >
                    {stage.label}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">{stage.description}</div>
                {state === "running" && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      style={{ width: "40%" }}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
