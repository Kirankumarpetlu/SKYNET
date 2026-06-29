import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/supabase";
import type { Project } from "@/lib/mock-data";
import { normalizeCRMRecord, type RawCRMRecord } from "@/lib/crm-records";

// ─── Fetch all projects from the backend ───────────────────────────────────

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
  return res.json();
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 30_000, // 30s
    refetchOnWindowFocus: true,
  });
}

// ─── Fetch a single project ────────────────────────────────────────────────

async function fetchProject(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/projects/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("NOT_FOUND");
    throw new Error(`Failed to fetch project: ${res.statusText}`);
  }
  return res.json() as Promise<{
    project: Project;
    documents: unknown[];
    contradictions: unknown[];
  }>;
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    staleTime: 30_000,
  });
}

// ─── Create a new project ──────────────────────────────────────────────────

interface CreateProjectPayload {
  name: string;
  description: string;
}

async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ?? `Failed to create project: ${res.statusText}`,
    );
  }
  // Backend returns raw DB row; transform to the UI Project shape
  const raw = await res.json();
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    status: "active",
    documentCount: 0,
    updatedAt: "Just now",
    riskScore: 0,
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      // Immediately refetch the projects list so the new project appears
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ─── Chat history ──────────────────────────────────────────────────────────

async function fetchChatHistory(projectId: string) {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/chat`);
  if (!res.ok) return [];
  return res.json();
}

export function useChatHistory(projectId: string) {
  return useQuery({
    queryKey: ["chat", projectId],
    queryFn: () => fetchChatHistory(projectId),
    staleTime: 60_000,
  });
}

// ─── Ask a question ────────────────────────────────────────────────────────

async function askQuestion(projectId: string, question: string) {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("QA failed");
  return res.json();
}

export function useAskQuestion(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (question: string) => askQuestion(projectId, question),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", projectId] });
    },
  });
}

// ─── CRM records ───────────────────────────────────────────────────────────

async function fetchCRMRecords() {
  const res = await fetch(`${API_BASE_URL}/api/crm`);
  if (!res.ok) return [];
  const records = (await res.json()) as RawCRMRecord[];
  return records.map(normalizeCRMRecord);
}

export function useCRMRecords() {
  return useQuery({
    queryKey: ["crm"],
    queryFn: fetchCRMRecords,
    staleTime: 60_000,
  });
}

// ─── All documents ─────────────────────────────────────────────────────────

async function fetchAllDocuments() {
  const res = await fetch(`${API_BASE_URL}/api/documents`);
  if (!res.ok) return [];
  return res.json();
}

export function useAllDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: fetchAllDocuments,
    staleTime: 30_000,
  });
}

// ─── Notifications ─────────────────────────────────────────────────────────

async function fetchNotifications() {
  const res = await fetch(`${API_BASE_URL}/api/notifications`);
  if (!res.ok) return [];
  return res.json();
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 15_000, // 15s refresh
    refetchInterval: 15_000, // keep notifications fresh
  });
}
