"use client";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { FileText, MoreHorizontal, Edit2 } from "lucide-react";
import { useState } from "react";
import { type Project } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { RenameProjectDialog } from "./rename-project-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusTone: Record<Project["status"], string> = {
  active: "bg-primary/10 text-primary",
  processing: "bg-warning/15 text-warning-foreground",
  completed: "bg-success/10 text-success",
  archived: "bg-muted text-muted-foreground",
};

export function ProjectCard({ project, index = 0, onProjectUpdated }: { project: Project; index?: number; onProjectUpdated?: () => void }) {
  const [renameOpen, setRenameOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
      >
        <Link
          to="/projects/$id"
          params={{ id: project.id }}
          className="glass-panel group block rounded-2xl p-5 transition-all hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRenameOpen(true);
                }} className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4" />
                  Rename Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <h3 className="mt-3 line-clamp-1 text-sm font-semibold">{project.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{project.documentCount} docs</span>
              <span>·</span>
              <span>{project.updatedAt}</span>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                statusTone[project.status],
              )}
            >
              {project.status}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Risk</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  project.riskScore < 33
                    ? "bg-success"
                    : project.riskScore < 66
                      ? "bg-warning"
                      : "bg-destructive",
                )}
                style={{ width: `${project.riskScore}%` }}
              />
            </div>
            <span className="w-6 text-right tabular-nums">{project.riskScore}</span>
          </div>
        </Link>
      </motion.div>
      <RenameProjectDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        projectId={project.id}
        currentName={project.name}
        currentDescription={project.description}
        onRenamed={onProjectUpdated}
      />
    </>
  );
}
