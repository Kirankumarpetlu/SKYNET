"use client";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-full bg-primary/10 blur-2xl" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-sm">
          <Icon className="h-7 w-7" />
        </div>
      </div>
      <h3 className="mt-5 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-5 rounded-lg">
          {action.label}
        </Button>
      )}
    </div>
  );
}
