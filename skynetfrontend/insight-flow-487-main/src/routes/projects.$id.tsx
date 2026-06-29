/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, notFound, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Upload, Share2, MoreHorizontal, FileText, Sparkles, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { suggestedPrompts, type ChatMessage as ChatMsg } from "@/lib/mock-data";
import { API_BASE_URL } from "@/lib/supabase";
import { ChatMessage, TypingIndicator } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { UploadZone } from "@/components/upload/upload-zone";
import { ProcessingTimeline } from "@/components/timeline/processing-timeline";
import { InsightsPanel } from "@/components/layout/insights-panel";
import { ClauseList } from "@/components/cards/clause-list";
import { cn } from "@/lib/utils";
import { useChatHistory, useAskQuestion } from "@/hooks/use-projects";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$id")({
  loader: async ({ params }) => {
    const res = await fetch(`${API_BASE_URL}/api/projects/${params.id}`);
    if (!res.ok) throw notFound();
    const data = await res.json();
    return {
      project: data.project,
      documents: data.documents ?? [],
      contradictions: data.contradictions ?? [],
      clauses: data.clauses ?? [],
      anomalies: data.anomalies ?? [],
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.project.name ?? "Project"} — SKYNET` },
      { name: "description", content: loaderData?.project.description ?? "" },
    ],
  }),
  component: ProjectWorkspace,
});

function mapStageToIndex(stageName: string): number {
  switch (stageName) {
    case "ingestion":
      return 0;
    case "ocr":
      return 1;
    case "classification":
      return 2;
    case "extraction":
      return 4;
    case "anomalies":
      return 5;
    case "risk_scoring":
      return 6;
    case "contradictions":
      return 7;
    case "crm":
      return 8;
    default:
      return 8;
  }
}

function ProjectWorkspace() {
  const { project, documents, clauses, anomalies } = Route.useLoaderData();
  const router = useRouter();

  const {
    data: chatHistory = [],
    refetch: refetchChat,
    isFetched: isChatFetched,
  } = useChatHistory(project.id);
  const askQuestion = useAskQuestion(project.id);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [stage, setStage] = useState(8); // start "complete"; resets when upload runs
  const [tab, setTab] = useState("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset initialization when project changes
  useEffect(() => {
    setChatLoaded(false);
  }, [project.id]);

  // Sync initial chatHistory to state
  useEffect(() => {
    if (isChatFetched && !chatLoaded) {
      setMessages(chatHistory);
      setChatLoaded(true);
    }
  }, [chatHistory, isChatFetched, chatLoaded]);

  // Establish WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = API_BASE_URL.replace(/^http/, "ws") + `/api/pipeline/ws/${project.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket event:", data);
        if (data.stage) {
          setStage(mapStageToIndex(data.stage));
        }
        if (data.status === "completed" || data.status === "failed") {
          toast.info(`Pipeline job ${data.status} for document.`);
          router.invalidate();
          refetchChat().then((res) => {
            if (res.data) setMessages(res.data);
          });
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [project.id, router, refetchChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = (text: string) => {
    const userMsg: ChatMsg = {
      id: `m-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    askQuestion.mutate(text, {
      onSuccess: (data) => {
        setLoading(false);
        const citations = data.citations || [];
        let citationMd = "";
        if (citations.length > 0) {
          citationMd =
            "\n\n**Citations:**\n" +
            citations
              .map((c: any) => `- **${c.document_name}**: *${c.source}* - "${c.quote}"`)
              .join("\n");
        }

        const assistantMsg: ChatMsg = {
          id: `m-${Date.now()}-r`,
          role: "assistant",
          content: data.answer + citationMd,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((m) => [...m, assistantMsg]);
        router.invalidate();
      },
      onError: (err) => {
        setLoading(false);
        toast.error("Failed to get answer", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      },
    });
  };

  const onUploaded = () => {
    setStage(0);
    setTab("pipeline");
    setUploadOpen(false);
    router.invalidate();
  };

  return (
    <div className="flex h-full">
      {/* Center workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Project header */}
        <div className="glass-header flex h-16 shrink-0 items-center justify-between px-6 shadow-xs">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/projects" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold">{project.name}</h1>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium capitalize text-success">
                  {project.status}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {project.documentCount} documents · Updated {project.updatedAt}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg">
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <div className="glass-header px-4 sm:px-6">
            <TabsList className="h-10 bg-transparent p-0 overflow-x-auto justify-start">
              <TabsTrigger
                value="chat"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm"
              >
                Documents
              </TabsTrigger>
              <TabsTrigger
                value="clauses"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm"
              >
                Clauses
              </TabsTrigger>
              <TabsTrigger
                value="pipeline"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm"
              >
                Pipeline
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs sm:text-sm lg:hidden"
              >
                Insights
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="m-0 flex min-h-0 flex-1 flex-col">
            <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-6 py-6">
                {messages.length === 0 ? (
                  <WelcomeScreen onPrompt={send} />
                ) : (
                  <div className="space-y-1">
                    <AnimatePresence>
                      {messages.map((m) => (
                        <ChatMessage key={m.id} message={m} />
                      ))}
                    </AnimatePresence>
                    {loading && <TypingIndicator />}
                  </div>
                )}
              </div>
            </div>
            <div className="glass-header border-t">
              <div className="mx-auto max-w-3xl px-6 py-4">
                <ChatInput
                  onSend={send}
                  loading={loading}
                  onStop={() => setLoading(false)}
                  projectId={project.id}
                  onUploaded={onUploaded}
                />
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  SKYNET can make mistakes — verify critical extractions.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="scrollbar-thin m-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
              <UploadZone projectId={project.id} onUploaded={onUploaded} />
              <div>
                <h3 className="mb-3 text-sm font-semibold">Project documents</h3>
                <div className="space-y-2">
                  {documents.length > 0 ? (
                    documents.map((d: any) => <DocRow key={d.id} doc={d} />)
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border/50 rounded-xl p-6 glass-panel">
                      No documents in this project yet. Upload a document to start processing.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clauses" className="scrollbar-thin m-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Extracted clauses</h3>
                <p className="text-xs text-muted-foreground">
                  Click a clause to view extracted text and source.
                </p>
              </div>
              <ClauseList clauses={clauses} />
            </div>
          </TabsContent>

          <TabsContent value="pipeline" className="scrollbar-thin m-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-6 py-6">
              <ProcessingTimeline current={stage} />
            </div>
          </TabsContent>

          <TabsContent value="insights" className="scrollbar-thin m-0 flex-1 overflow-y-auto lg:hidden">
            <div className="mx-auto max-w-xl py-4">
              <InsightsPanel
                projectName={project.name}
                riskScore={project.riskScore}
                riskBreakdown={project.riskBreakdown}
                documents={documents}
                anomalies={anomalies}
                activity={project.activity}
                inline={true}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right insights */}
      <InsightsPanel
        projectName={project.name}
        riskScore={project.riskScore}
        riskBreakdown={project.riskBreakdown}
        documents={documents}
        anomalies={anomalies}
        activity={project.activity}
      />

      {/* Upload modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Upload documents</DialogTitle>
          </DialogHeader>
          <UploadZone projectId={project.id} onUploaded={onUploaded} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WelcomeScreen({ onPrompt }: { onPrompt: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl" />
        <div className="glass-card flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
      </motion.div>
      <h2 className="mt-6 text-xl font-semibold tracking-tight">Upload documents to begin</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Drop contracts, invoices, or statements. SKYNET will OCR, classify, and let you ask questions
        in natural language.
      </p>
      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestedPrompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className={cn(
              "glass-panel group rounded-xl px-4 py-3 text-left text-sm transition-all hover:border-primary/40 hover:shadow-sm",
            )}
          >
            <span className="text-muted-foreground transition-colors group-hover:text-foreground">
              {p}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DocRow({ doc }: { doc: any }) {
  return (
    <div className="glass-panel flex items-center gap-3 rounded-xl p-3 transition-colors hover:border-primary/30">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{doc.name}</div>
        <div className="text-[11px] text-muted-foreground">
          {doc.type?.toUpperCase() || "Unknown"} · Uploaded {doc.uploadedAt}
        </div>
      </div>
      {doc.file_url && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 rounded-lg text-xs"
          onClick={() => window.open(doc.file_url, "_blank")}
        >
          Open
        </Button>
      )}
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
          doc.status === "completed"
            ? "bg-success/10 text-success"
            : doc.status === "processing"
              ? "bg-warning/15 text-warning-foreground"
              : doc.status === "failed"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
        )}
      >
        {doc.status}
      </span>
    </div>
  );
}
