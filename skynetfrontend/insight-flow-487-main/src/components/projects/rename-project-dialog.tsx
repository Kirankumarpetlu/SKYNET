"use client";
import { useState, useEffect } from "react";
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
import { renameProject } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  currentName: string;
  currentDescription?: string;
  onRenamed?: () => void;
}

export function RenameProjectDialog({
  open,
  onOpenChange,
  projectId,
  currentName,
  currentDescription = "",
  onRenamed,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setDescription(currentDescription);
    }
  }, [open, currentName, currentDescription]);

  const handleRename = async () => {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);
    try {
      await renameProject(projectId, name.trim(), description.trim());
      toast.success("Project renamed", { description: name.trim() });
      onOpenChange(false);
      onRenamed?.();
    } catch (err) {
      toast.error("Failed to rename project", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>
            Update the project name and description.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rename-name">Project name</Label>
            <Input
              id="rename-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vendor Contract Q4"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rename-desc">Description</Label>
            <Textarea
              id="rename-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={isLoading}>
            {isLoading ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
