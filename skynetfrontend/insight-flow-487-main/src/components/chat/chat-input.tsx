"use client";
import { Paperclip, Mic, ArrowUp, Square, Loader2 } from "lucide-react";
import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  onSend: (value: string) => void;
  onStop?: () => void;
  loading?: boolean;
  placeholder?: string;
  projectId?: string;
  onUploaded?: () => void;
}

export function ChatInput({
  onSend,
  onStop,
  loading,
  placeholder = "Ask anything about your documents…",
  projectId,
  onUploaded,
}: Props) {
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!value.trim() || loading) return;
    onSend(value.trim());
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (projectId) {
      setUploading(true);
      const toastId = toast.loading(`Uploading ${files.length} document(s)...`);
      const formData = new FormData();
      Array.from(files).forEach((f) => {
        formData.append("files", f);
      });

      try {
        const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/upload`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("File upload failed");
        
        toast.success("Document uploaded successfully. Processing started.", { id: toastId });
        onUploaded?.();
      } catch (err) {
        toast.error("Upload failed", {
          id: toastId,
          description: err instanceof Error ? err.message : "Please try again.",
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } else {
      toast.info(`Selected ${files.length} file(s): ${Array.from(files).map((f) => f.name).join(", ")}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-sm transition-shadow focus-within:shadow-md">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFileChange}
      />
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        rows={1}
        placeholder={placeholder}
        className="scrollbar-thin max-h-44 min-h-[52px] resize-none border-0 bg-transparent px-4 py-3.5 text-sm shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePaperclipClick}
            disabled={uploading}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            title="Attach documents (PDF, DOCX, XLSX, images)"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => toast.info("Voice input feature activated.")}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            title="Voice input"
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>
        {loading ? (
          <Button size="icon" variant="secondary" onClick={onStop} className="h-8 w-8 rounded-lg">
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={submit}
            disabled={!value.trim()}
            className={cn("h-8 w-8 rounded-lg")}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
