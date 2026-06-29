import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderKanban, Plus, LayoutGrid, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/projects/project-card";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { useProjects } from "@/hooks/use-projects";

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects — SKYNET" },
      { name: "description", content: "All your document intelligence projects." },
    ],
  }),
});

function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: projects = [], isLoading, isError, refetch } = useProjects();

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {/* Glassmorphism Hero Header Banner */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-8 shadow-md mb-8">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Projects Workspace</h1>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-lg">
                Group documents into intelligent workspaces and analyze contracts, insights, and anomalies. {!isLoading && `(${projects.length} active projects)`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-border/50 bg-background/40 backdrop-blur-md p-0.5">
                <Button size="icon" variant="ghost" className="h-8 w-8 bg-muted/60">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setOpen(true)} className="rounded-lg shadow-md" size="default">
                <Plus className="mr-1.5 h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 max-w-md">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="h-9 rounded-lg bg-card/60 backdrop-blur-md border-border/60"
          />
        </div>


        {isLoading ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading projects…</p>
          </div>
        ) : isError ? (
          <div className="mt-16 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive">Failed to load projects.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} onProjectUpdated={() => refetch()} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to start uploading and analyzing documents."
            action={{ label: "Create project", onClick: () => setOpen(true) }}
          />
        )}
      </div>
      <NewProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
