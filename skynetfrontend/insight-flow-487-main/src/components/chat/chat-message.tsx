"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Bot, User, Copy, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { type ChatMessage as ChatMessageType } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const copy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Copied to clipboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("group flex w-full gap-3 px-1 py-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={cn("flex max-w-[85%] min-w-0 flex-col", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-border",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="my-2 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs">
                      {children}
                    </pre>
                  ),
                  table: ({ children }) => (
                    <div className="my-2 overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-border bg-muted px-3 py-1.5 text-left font-medium">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-border px-3 py-1.5">{children}</td>
                  ),
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
            isUser && "flex-row-reverse",
          )}
        >
          <span>{message.timestamp}</span>
          {!isUser && (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copy}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 px-1 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        <span
          className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: "200ms" }}
        />
        <span
          className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: "400ms" }}
        />
      </div>
    </div>
  );
}
