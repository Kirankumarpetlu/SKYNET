"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateProject } from "@/hooks/use-projects";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

export function NewProjectDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const { mutate: createProject, isPending } = useCreateProject();

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject(
      { name: name.trim(), description: desc.trim() },
      {
        onSuccess: (project) => {
          toast.success("Project created", { description: project.name });
          setName("");
          setDesc("");
          onOpenChange(false);
          onCreated?.();
        },
        onError: (err) => {
          toast.error("Failed to create project", {
            description: err instanceof Error ? err.message : "Please try again.",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogDescription>
            Group related documents into a workspace. You'll be able to upload and chat with them.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vendor Contract Q4"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isPending}>
            {isPending ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
