"use client";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Settings,
  FolderKanban,
  Database,
  ChevronLeft,
  FileText,
  Sparkles,
  User,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/common/logo";
import { useProjects } from "@/hooks/use-projects";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: projects = [] } = useProjects();
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const navItems = [
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/crm", label: "CRM Records", icon: Database },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="glass-sidebar relative flex h-full flex-col text-sidebar-foreground"
    >
      {/* Header */}
      <div className="flex h-14 items-center gap-2 px-3">
        <Logo size="md" />

        {!collapsed && (
          <div className="flex-1 truncate">
            <div className="text-sm font-semibold tracking-tight">SKYNET</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Document Intelligence
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7 shrink-0">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* New project */}
      <div className="px-3">
        <Button
          onClick={() => setNewOpen(true)}
          className={cn(
            "w-full justify-start gap-2 rounded-lg",
            collapsed && "justify-center px-0",
          )}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && "New Project"}
        </Button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="h-8 rounded-lg bg-background pl-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="mt-4 space-y-0.5 px-2">
        {navItems.map((it) => {
          const active = pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center",
              )}
            >
              <it.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Projects */}
      {!collapsed && (
        <div className="mt-5 flex-1 overflow-hidden">
          <div className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent Projects
          </div>
          <div className="scrollbar-thin h-full overflow-y-auto px-2 pb-4">
            <AnimatePresence initial={false}>
              {filtered.map((p) => {
                const active = pathname === `/projects/${p.id}`;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Link
                      to="/projects/$id"
                      params={{ id: p.id }}
                      className={cn(
                        "group flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-foreground/90">
                          {p.name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {p.documentCount} docs · {p.updatedAt}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No projects found
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Profile */}
      <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-1.5 py-1",
            collapsed && "justify-center",
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-foreground">
            KK
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">Kiran Kumar</div>
              <div className="truncate text-[10px] text-muted-foreground">kirankumarpetlu48@gmail.com</div>
            </div>
          )}
        </div>
      </div>

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </motion.aside>
  );
}
