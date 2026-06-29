"use client";
import { UploadCloud, FileText, FileSpreadsheet, FileImage, X, Check, Loader2 } from "lucide-react";
import { useState, useRef, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/supabase";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: "uploading" | "processing" | "completed";
  progress: number;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "csv") return FileSpreadsheet;
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return FileImage;
  return FileText;
}

interface Props {
  projectId?: string;
  onUploaded?: () => void;
}

export function UploadZone({ projectId, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;

    if (projectId) {
      const formData = new FormData();
      Array.from(list).forEach((f) => {
        formData.append("files", f);
      });

      const next: UploadedFile[] = Array.from(list).map((f) => ({
        id: `${Date.now()}-${f.name}`,
        name: f.name,
        size: fmtSize(f.size),
        type: f.type,
        status: "uploading",
        progress: 30,
      }));
      setFiles((prev) => [...prev, ...next]);

      fetch(`${API_BASE_URL}/api/projects/${projectId}/upload`, {
        method: "POST",
        body: formData,
      })
        .then((res) => {
          if (!res.ok) throw new Error("Upload failed");
          return res.json();
        })
        .then((data) => {
          setFiles((prev) =>
            prev.map((x) =>
              next.some((n) => n.name === x.name)
                ? { ...x, progress: 100, status: "completed" }
                : x,
            ),
          );
          toast.success("Upload successful. Processing started.");
          onUploaded?.();
        })
        .catch((err) => {
          setFiles((prev) =>
            prev.map((x) =>
              next.some((n) => n.name === x.name) ? { ...x, progress: 0, status: "uploading" } : x,
            ),
          );
          toast.error("Upload failed", {
            description: err instanceof Error ? err.message : "Please try again.",
          });
        });
    } else {
      const next: UploadedFile[] = Array.from(list).map((f) => ({
        id: `${Date.now()}-${f.name}`,
        name: f.name,
        size: fmtSize(f.size),
        type: f.type,
        status: "uploading",
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...next]);
      next.forEach((file) => {
        let p = 0;
        const t = setInterval(() => {
          p += Math.random() * 18 + 8;
          if (p >= 100) {
            p = 100;
            clearInterval(t);
            setFiles((prev) =>
              prev.map((x) =>
                x.id === file.id ? { ...x, progress: 100, status: "processing" } : x,
              ),
            );
            setTimeout(() => {
              setFiles((prev) =>
                prev.map((x) => (x.id === file.id ? { ...x, status: "completed" } : x)),
              );
              toast.success(`${file.name} processed`);
              onUploaded?.();
            }, 1200);
          } else {
            setFiles((prev) => prev.map((x) => (x.id === file.id ? { ...x, progress: p } : x)));
          }
        }, 220);
      });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 px-6 py-12 transition-all",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UploadCloud className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Drop documents here, or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, DOCX, XLSX, PNG, JPG — up to 50MB each
          </p>
        </div>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {files.map((f) => {
              const Icon = iconFor(f.name);
              return (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium">{f.name}</div>
                      <div className="shrink-0 text-xs text-muted-foreground">{f.size}</div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            f.status === "completed" ? "bg-success" : "bg-primary",
                          )}
                          animate={{ width: `${f.progress}%` }}
                          transition={{ ease: "easeOut" }}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {f.status === "uploading" && `${Math.floor(f.progress)}%`}
                        {f.status === "processing" && "Processing…"}
                        {f.status === "completed" && "Done"}
                      </span>
                    </div>
                  </div>
                  {f.status === "completed" ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  ) : f.status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles((prev) => prev.filter((x) => x.id !== f.id));
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
