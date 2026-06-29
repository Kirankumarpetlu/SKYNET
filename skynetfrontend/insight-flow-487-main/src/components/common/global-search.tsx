/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useNavigate } from "@tanstack/react-router";
import { FileText, FolderKanban, Database } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useProjects, useAllDocuments, useCRMRecords } from "@/hooks/use-projects";
import { useEffect } from "react";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: documents = [] } = useAllDocuments();
  const { data: crmRecords = [] } = useCRMRecords();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate({ to: path });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search projects, documents, CRM accounts..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Projects">
          {projects.map((p) => (
            <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)}>
              <FolderKanban className="mr-2 h-4 w-4" />
              <span>{p.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Documents">
          {documents.map((d: any) => (
            <CommandItem key={d.id} onSelect={() => go(`/projects/${d.project_id}`)}>
              <FileText className="mr-2 h-4 w-4" />
              <span>{d.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="CRM Records">
          {crmRecords.map((r: any) => (
            <CommandItem key={r.id} onSelect={() => go(`/crm/${r.id}`)}>
              <Database className="mr-2 h-4 w-4" />
              <span>{r.accountName}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
