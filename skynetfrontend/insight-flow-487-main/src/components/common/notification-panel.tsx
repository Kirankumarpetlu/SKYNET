/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/use-projects";
import { AlertTriangle, Upload, Database, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  upload: Upload,
  risk: AlertTriangle,
  crm: Database,
  comparison: GitCompare,
} as const;

const tones = {
  upload: "bg-primary/10 text-primary",
  risk: "bg-destructive/10 text-destructive",
  crm: "bg-success/10 text-success",
  comparison: "bg-warning/10 text-warning-foreground",
} as const;

export function NotificationPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: notifications = [] } = useNotifications();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="scrollbar-thin h-[calc(100vh-65px)] overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((n: any) => {
              const Icon = icons[n.type as keyof typeof icons] || AlertTriangle;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 border-b border-border px-5 py-4 transition-colors hover:bg-muted/50",
                    !n.read && "bg-primary/[0.03]",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      tones[n.type as keyof typeof tones] || "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{n.title}</div>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{n.message}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground/70">{n.time}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No notifications yet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
