"use client";
import { type ReactNode, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import DarkVeil from "@/components/ui/dark-veil";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      {/* Fixed Full-Screen Background DarkVeil */}
      <div className="fixed inset-0 z-0">
        <DarkVeil />
      </div>

      {/* Foreground Glassmorphism UI */}
      <div className="relative z-10 flex h-full w-full overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}

