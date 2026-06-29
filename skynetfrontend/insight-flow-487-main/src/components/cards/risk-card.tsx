"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  breakdown?: { label: string; value: number }[];
}

export function RiskCard({ score, breakdown }: Props) {
  const level = score < 33 ? "Low" : score < 66 ? "Medium" : "High";
  const tone =
    score < 33 ? "text-success" : score < 66 ? "text-warning" : "text-destructive";
  const badgeBg =
    score < 33 ? "bg-success/15 text-success" : score < 66 ? "bg-warning/20 text-warning" : "bg-destructive/15 text-destructive";
  const ring = score < 33 ? "stroke-success" : score < 66 ? "stroke-warning" : "stroke-destructive";

  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Overall Risk</h3>
          <p className="text-xs text-muted-foreground">Composite intelligence score</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", badgeBg)}>
          {level}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-[92px] w-[92px]">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-muted/40"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              className={ring}
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ strokeDasharray: circ }}
            />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-foreground drop-shadow-sm"
          >
            {score}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {(
            breakdown ?? [
              { label: "Legal", value: 65 },
              { label: "Financial", value: 48 },
              { label: "Operational", value: 32 },
            ]
          ).map((b) => (
            <div key={b.label}>
              <div className="mb-1 flex justify-between text-xs font-medium text-foreground">
                <span>{b.label}</span>
                <span className="tabular-nums font-semibold">{b.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${b.value}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    b.value < 33 ? "bg-success" : b.value < 66 ? "bg-warning" : "bg-destructive",
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
