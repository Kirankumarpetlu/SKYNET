import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ffeijsftoahspvhdhmll.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZWlqc2Z0b2Foc3B2aGRobWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTE2NDUsImV4cCI6MjA5ODAyNzY0NX0.AGXFOrTC70njgy_iXNOG5Gc-ljNu7sNErvxtmoRJ-WY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database types matching the real Supabase schema
export interface DbProject {
  id: string;
  name: string;
  description: string | null;
  user_id: string | null;
  created_at: string;
}

export interface DbDocument {
  id: string;
  project_id: string;
  name: string;
  file_path: string | null;
  file_hash: string | null;
  status: "uploaded" | "processing" | "completed" | "failed";
  file_type: string | null;
  content: string | null;
  doc_type: string | null;
  created_at: string;
  updated_at: string;
}

// The backend API base URL.
// Set VITE_API_BASE_URL in Cloudflare Pages env vars to your Railway backend URL.
// Falls back to localhost:8000 for local development.
export const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ||
  "http://localhost:8000";
