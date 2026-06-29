const API_BASE_URL = "http://localhost:8000/api";

export async function fetchProjects() {
  const res = await fetch(`${API_BASE_URL}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function createProject(name: string, description: string = "") {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function renameProject(projectId: string, name: string, description?: string) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error("Failed to rename project");
  return res.json();
}

export async function fetchProjectDetails(projectId: string) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}`);
  if (!res.ok) throw new Error("Failed to fetch project details");
  return res.json();
}

export async function uploadDocuments(projectId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload documents");
  return res.json();
}

export async function fetchDocumentDetails(documentId: string) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}`);
  if (!res.ok) throw new Error("Failed to fetch document details");
  return res.json();
}

export async function syncDocumentToCRM(documentId: string) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/sync`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to sync document to CRM");
  return res.json();
}

export async function askProjectQuestion(projectId: string, question: string) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("Failed to ask question");
  return res.json();
}

export async function fetchProjectChatHistory(projectId: string) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/chat`);
  if (!res.ok) throw new Error("Failed to fetch chat history");
  return res.json();
}

export async function fetchCRMRecords() {
  const res = await fetch(`${API_BASE_URL}/crm`);
  if (!res.ok) throw new Error("Failed to fetch CRM records");
  return res.json();
}

export function getWebSocketUrl(projectId: string) {
  return `ws://localhost:8000/api/pipeline/ws/${projectId}`;
}
