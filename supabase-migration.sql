-- Supabase Migration for SKYNET Document Intelligence
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT,
    file_hash TEXT,
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
    file_type TEXT,
    content TEXT,
    doc_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Risk scores table
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    overall_score NUMERIC(5,2) DEFAULT 0,
    risk_breakdown JSONB DEFAULT '{}',
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Entities table
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    value TEXT,
    confidence NUMERIC(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Clauses table
CREATE TABLE IF NOT EXISTS clauses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    clause_type TEXT NOT NULL,
    text TEXT,
    explanation TEXT,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'warning', 'info')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Contradictions table
CREATE TABLE IF NOT EXISTS contradictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'warning')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CRM logs table
CREATE TABLE IF NOT EXISTS crm_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('synced', 'pending', 'failed')),
    error_message TEXT,
    last_attempt TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. QA History table
CREATE TABLE IF NOT EXISTS qa_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Pipeline jobs table
CREATE TABLE IF NOT EXISTS pipeline_jobs (
    id TEXT PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    current_stage TEXT,
    progress NUMERIC(5,2) DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Processing logs table
CREATE TABLE IF NOT EXISTS processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id TEXT REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    stage TEXT,
    message TEXT,
    log_level TEXT CHECK (log_level IN ('info', 'warning', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_document_id ON risk_scores(document_id);
CREATE INDEX IF NOT EXISTS idx_entities_document_id ON entities(document_id);
CREATE INDEX IF NOT EXISTS idx_clauses_document_id ON clauses(document_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_document_id ON anomalies(document_id);
CREATE INDEX IF NOT EXISTS idx_contradictions_document_id ON contradictions(document_id);
CREATE INDEX IF NOT EXISTS idx_crm_logs_document_id ON crm_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_qa_history_project_id ON qa_history(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_document_id ON pipeline_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_job_id ON processing_logs(job_id);

-- Row Level Security (RLS) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for now (can restrict later with auth)
CREATE POLICY "Public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON documents FOR SELECT USING (true);
CREATE POLICY "Public read access" ON risk_scores FOR SELECT USING (true);
CREATE POLICY "Public read access" ON entities FOR SELECT USING (true);
CREATE POLICY "Public read access" ON clauses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON anomalies FOR SELECT USING (true);
CREATE POLICY "Public read access" ON contradictions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON crm_logs FOR SELECT USING (true);
CREATE POLICY "Public read access" ON qa_history FOR SELECT USING (true);
CREATE POLICY "Public read access" ON pipeline_jobs FOR SELECT USING (true);
CREATE POLICY "Public read access" ON processing_logs FOR SELECT USING (true);

-- Public insert for now (can restrict later with auth)
CREATE POLICY "Public insert access" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON risk_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON entities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON clauses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON anomalies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON contradictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON crm_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON qa_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON pipeline_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON processing_logs FOR INSERT WITH CHECK (true);

-- Public update for now
CREATE POLICY "Public update access" ON projects FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON documents FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON risk_scores FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON entities FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON clauses FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON anomalies FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON contradictions FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON crm_logs FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON qa_history FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON pipeline_jobs FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON processing_logs FOR UPDATE USING (true);