/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Bell, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationPanel } from "@/components/common/notification-panel";
import { GlobalSearch } from "@/components/common/global-search";
import { useNotifications } from "@/hooks/use-projects";

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n: any) => !n.read).length;

  return (
    <header className="glass-header flex h-14 shrink-0 items-center justify-between px-4 shadow-xs">

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className="h-8 gap-2 rounded-lg text-muted-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden text-xs sm:inline">Search projects, documents, records…</span>
          <kbd className="ml-2 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-lg"
          onClick={() => setNotifOpen(true)}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
        <ThemeToggle />
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationPanel open={notifOpen} onOpenChange={setNotifOpen} />
    </header>
  );
}
