import os
import hashlib
import uuid
import logging
from datetime import datetime, timezone
from typing import List
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, WebSocket, WebSocketDisconnect, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel 

from app.core.config import settings
from app.core.security import supabase_client
from app.core.supabase_storage import storage_service
from app.services.parsers.ingest import parse_document
from app.services.pipeline import manager, process_document_pipeline
from app.services.notion_sync import sync_document_to_notion
from app.services.qa import answer_document_question

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("main")

app = FastAPI(title="SKYNET Document Intelligence API", version="0.1.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class QuestionPayload(BaseModel):
    question: str

def format_relative_time(dt_str: str) -> str:
    """Helper to convert ISO format to human readable relative time."""
    try:
        # If naive, assume UTC since we store naive UTC datetime strings
        if not dt_str.endswith("Z") and not ("+" in dt_str or "-" in dt_str.split("T")[-1]):
            dt_str += "Z"
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt
        if diff.days > 0:
            if diff.days == 1:
                return "Yesterday"
            return f"{diff.days} days ago"
        seconds = diff.seconds
        if seconds < 60:
            return "Just now"
        minutes = seconds // 60
        if minutes < 60:
            return f"{minutes}m ago"
        hours = minutes // 60
        return f"{hours}h ago"
    except Exception:
        return "Recent"

# --- API ENDPOINTS ---

@app.post("/api/projects")
async def create_project(payload: ProjectCreate):
    project_id = str(uuid.uuid4())
    project_data = {
        "id": project_id,
        "name": payload.name,
        "description": payload.description,
        "created_at": datetime.utcnow().isoformat()
    }
    
    res = supabase_client.table("projects").insert(project_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create project.")
    return res.data[0]

@app.get("/api/projects")
async def list_projects():
    projects_res = supabase_client.table("projects").select("*").order("created_at", desc=True).execute()
    projects = []
    
    for p in projects_res.data:
        p_id = p["id"]
        # Fetch document count
        docs_res = supabase_client.table("documents").select("id, status").eq("project_id", p_id).execute()
        doc_count = len(docs_res.data) if docs_res.data else 0
        
        # Calculate status
        status = "active"
        if doc_count > 0:
            statuses = [d["status"] for d in docs_res.data]
            if any(s == "processing" for s in statuses):
                status = "processing"
            elif all(s == "completed" for s in statuses):
                status = "completed"
            elif any(s == "failed" for s in statuses):
                status = "failed"
                
        # Calculate average risk score
        risk_score = 0
        if doc_count > 0:
            doc_ids = [d["id"] for d in docs_res.data]
            risk_res = supabase_client.table("risk_scores").select("overall_score").in_("document_id", doc_ids).execute()
            if risk_res.data:
                risk_score = int(sum(r["overall_score"] for r in risk_res.data) / len(risk_res.data))

        projects.append({
            "id": p_id,
            "name": p["name"],
            "description": p["description"] or "",
            "status": status,
            "documentCount": doc_count,
            "updatedAt": format_relative_time(p["created_at"]),
            "riskScore": risk_score
        })
        
    return projects

@app.get("/api/projects/{project_id}")
async def get_project_details(project_id: str):
    # Fetch project
    p_res = supabase_client.table("projects").select("*").eq("id", project_id).execute()
    if not p_res.data:
        raise HTTPException(status_code=404, detail="Project not found.")
    p = p_res.data[0]
    
    # Fetch documents
    docs_res = supabase_client.table("documents").select("*").eq("project_id", project_id).execute()
    documents = []
    for d in docs_res.data:
        file_path = d.get("file_path", "")
        file_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/contracts/{file_path}" if file_path else None
        documents.append({
            "id": d["id"],
            "name": d["name"],
            "type": d["file_type"],
            "size": "N/A", # Size is not stored in DB, can mock
            "status": d["status"],
            "uploadedAt": format_relative_time(d["created_at"]),
            "projectId": project_id,
            "file_url": file_url
        })
        
    # Calculate average risk score and risk breakdown
    risk_score = 0
    risk_breakdown = {"legal": 0, "financial": 0, "operational": 0}
    if documents:
        doc_ids = [d["id"] for d in docs_res.data]
        risk_res = supabase_client.table("risk_scores").select("overall_score, risk_breakdown").in_("document_id", doc_ids).execute()
        if risk_res.data:
            risk_score = int(sum(r["overall_score"] for r in risk_res.data) / len(risk_res.data))
            
            legal_scores = []
            financial_scores = []
            operational_scores = []
            for r in risk_res.data:
                rb = r.get("risk_breakdown") or {}
                if "legal" in rb:
                    legal_scores.append(float(rb["legal"]))
                if "financial" in rb:
                    financial_scores.append(float(rb["financial"]))
                if "operational" in rb:
                    operational_scores.append(float(rb["operational"]))
                    
            risk_breakdown = {
                "legal": int(sum(legal_scores) / len(legal_scores)) if legal_scores else 0,
                "financial": int(sum(financial_scores) / len(financial_scores)) if financial_scores else 0,
                "operational": int(sum(operational_scores) / len(operational_scores)) if operational_scores else 0,
            }

    # Fetch contradictions, clauses, anomalies and recent activity logs
    doc_ids = [d["id"] for d in docs_res.data]
    contradictions = []
    clauses = []
    anomalies = []
    activity = []
    if doc_ids:
        # Contradictions
        contradictions_res = supabase_client.table("contradictions").select("*").in_("document_id", doc_ids).execute()
        if contradictions_res.data:
            for c in contradictions_res.data:
                # Find document name
                doc_name = next((d["name"] for d in docs_res.data if d["id"] == c["document_id"]), "Document")
                target_name = next((d["name"] for d in docs_res.data if d["id"] == c["target_document_id"]), "Other Document")
                contradictions.append({
                    "id": c["id"],
                    "document_name": doc_name,
                    "target_document_name": target_name,
                    "description": c["description"],
                    "severity": c["severity"]
                })
        
        # Clauses
        clauses_res = supabase_client.table("clauses").select("*").in_("document_id", doc_ids).execute()
        if clauses_res.data:
            for c in clauses_res.data:
                doc_name = next((d["name"] for d in docs_res.data if d["id"] == c["document_id"]), "Document")
                clauses.append({
                    "id": c["id"],
                    "document_id": c["document_id"],
                    "document_name": doc_name,
                    "title": c["clause_type"].replace("_", " ").title(),
                    "summary": c["explanation"],
                    "risk": c["risk_level"],
                    "text": c["text"]
                })
                
        # Anomalies
        anomalies_res = supabase_client.table("anomalies").select("*").in_("document_id", doc_ids).execute()
        if anomalies_res.data:
            for a in anomalies_res.data:
                doc_name = next((d["name"] for d in docs_res.data if d["id"] == a["document_id"]), "Document")
                anomalies.append({
                    "id": a["id"],
                    "document_id": a["document_id"],
                    "document_name": doc_name,
                    "type": a["type"],
                    "title": a["type"].replace("_", " ").title(),
                    "detail": a["description"],
                    "severity": a["severity"]
                })
                
        # Recent activity logs (top 5 processing logs)
        jobs_res = supabase_client.table("pipeline_jobs").select("id").in_("document_id", doc_ids).execute()
        if jobs_res.data:
            job_ids = [j["id"] for j in jobs_res.data]
            logs_res = supabase_client.table("processing_logs").select("message, created_at").in_("job_id", job_ids).order("created_at", desc=True).limit(5).execute()
            if logs_res.data:
                for l in logs_res.data:
                    activity.append({
                        "message": l["message"],
                        "time": format_relative_time(l["created_at"])
                    })

    return {
        "project": {
            "id": p["id"],
            "name": p["name"],
            "description": p["description"] or "",
            "status": "completed" if all(d["status"] == "completed" for d in documents) else "active",
            "documentCount": len(documents),
            "updatedAt": format_relative_time(p["created_at"]),
            "riskScore": risk_score,
            "riskBreakdown": risk_breakdown,
            "activity": activity
        },
        "documents": documents,
        "contradictions": contradictions,
        "clauses": clauses,
        "anomalies": anomalies
    }

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate):
    # Check if project exists
    p_res = supabase_client.table("projects").select("*").eq("id", project_id).execute()
    if not p_res.data:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    # Prepare update data
    update_data = {}
    if payload.name is not None:
        update_data["name"] = payload.name
    if payload.description is not None:
        update_data["description"] = payload.description
    
    if not update_data:
        return p_res.data[0]
    
    # Update project
    res = supabase_client.table("projects").update(update_data).eq("id", project_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update project.")
    return res.data[0]

@app.post("/api/projects/{project_id}/upload")
async def upload_documents(project_id: str, background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    uploaded_docs = []
    
    for file in files:
        file_bytes = await file.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        
        # Determine unique filename to avoid storage overrides
        doc_id = str(uuid.uuid4())
        unique_filename = f"{doc_id}_{file.filename}"
        
        # 1. Upload to Supabase Storage
        try:
            storage_service.upload_file("contracts", unique_filename, file_bytes, file.content_type)
        except Exception as e:
            logger.error(f"Storage upload failed for {file.filename}: {e}")
            
        # 2. Extract text (Format routing & normalization)
        try:
            extracted_text, ocr_conf, ocr_warn, doc_format = parse_document(file.filename, file_bytes)
        except Exception as e:
            logger.error(f"Document parsing failed for {file.filename}: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to parse document {file.filename}: {e}")
            
        # 3. Save Document details in DB
        doc_data = {
            "id": doc_id,
            "project_id": project_id,
            "name": file.filename,
            "file_path": unique_filename,
            "file_hash": file_hash,
            "status": "processing",
            "file_type": file.filename.split(".")[-1].lower(),
            "content": extracted_text,
            "doc_type": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        res = supabase_client.table("documents").insert(doc_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save document metadata.")
            
        uploaded_docs.append(res.data[0])
        
        # 4. Trigger processing pipeline asynchronously
        background_tasks.add_task(process_document_pipeline, doc_id, project_id)
        
    return {"status": "processing", "documents": uploaded_docs}

@app.get("/api/documents/{document_id}")
async def get_document_details(document_id: str):
    doc_res = supabase_client.table("documents").select("*").eq("id", document_id).execute()
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc = doc_res.data[0]
    
    # Fetch risk score
    risk_res = supabase_client.table("risk_scores").select("*").eq("document_id", document_id).execute()
    risk = risk_res.data[0] if risk_res.data else {"overall_score": 0, "risk_breakdown": {}, "explanation": "No risk analysis run."}
    
    # Fetch entities
    entities_res = supabase_client.table("entities").select("*").eq("document_id", document_id).execute()
    
    # Fetch clauses
    clauses_res = supabase_client.table("clauses").select("*").eq("document_id", document_id).execute()
    
    # Fetch anomalies
    anomalies_res = supabase_client.table("anomalies").select("*").eq("document_id", document_id).execute()
    
    # Fetch CRM status
    crm_res = supabase_client.table("crm_logs").select("*").eq("document_id", document_id).execute()
    crm = crm_res.data[0] if crm_res.data else {"status": "pending", "error_message": None}

    # Format entities and clauses for the UI
    formatted_clauses = []
    for c in clauses_res.data:
        formatted_clauses.append({
            "id": c["id"],
            "title": c["clause_type"].replace("_", " ").title(),
            "summary": c["explanation"],
            "risk": c["risk_level"],
            "text": c["text"]
        })

    formatted_anomalies = {"critical": [], "warning": [], "info": []}
    for a in anomalies_res.data:
        sev = a["severity"] if a["severity"] in ["critical", "warning", "info"] else "warning"
        formatted_anomalies[sev].append({
            "id": a["id"],
            "title": a["type"].replace("_", " ").title(),
            "detail": a["description"]
        })

    return {
        "id": doc["id"],
        "name": doc["name"],
        "doc_type": doc["doc_type"] or "other",
        "status": doc["status"],
        "risk_score": risk["overall_score"],
        "risk_explanation": risk["explanation"],
        "risk_breakdown": risk["risk_breakdown"],
        "entities": entities_res.data,
        "clauses": formatted_clauses,
        "anomalies": formatted_anomalies,
        "crm_status": crm["status"],
        "crm_error": crm["error_message"]
    }

@app.post("/api/documents/{document_id}/sync")
async def sync_document(document_id: str):
    try:
        res = await sync_document_to_notion(document_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_id}/qa")
async def ask_question(project_id: str, payload: QuestionPayload):
    res = await answer_document_question(project_id, payload.question)
    return res

@app.get("/api/projects/{project_id}/chat")
async def get_chat_history(project_id: str):
    qa_res = supabase_client.table("qa_history").select("*").eq("project_id", project_id).order("created_at", desc=False).execute()
    messages = []
    
    for q in qa_res.data:
        messages.append({
            "id": f"q-{q['id']}",
            "role": "user",
            "content": q["question"],
            "timestamp": format_relative_time(q["created_at"])
        })
        
        # Build assistant citation text
        citations = q.get("citations", [])
        citation_md = ""
        if citations:
            citation_md = "\n\n**Citations:**\n"
            for c in citations:
                citation_md += f"- **{c.get('document_name')}**: *{c.get('source')}* - \"{c.get('quote')}\"\n"
                
        messages.append({
            "id": f"a-{q['id']}",
            "role": "assistant",
            "content": q["answer"] + citation_md,
            "timestamp": format_relative_time(q["created_at"])
        })
        
    return messages

@app.get("/api/documents")
async def list_documents():
    docs_res = supabase_client.table("documents").select("id, name, project_id, status, file_type, created_at").execute()
    return docs_res.data or []

@app.get("/api/notifications")
async def list_notifications():
    notifications = []
    
    # 1. High risk documents
    risk_res = supabase_client.table("risk_scores").select("overall_score, created_at, documents(name)").order("created_at", desc=True).limit(5).execute()
    if risk_res.data:
        for idx, r in enumerate(risk_res.data):
            score = float(r.get("overall_score") or 0)
            if score > 70:
                doc = r.get("documents") or {}
                doc_name = doc.get("name", "Document")
                notifications.append({
                    "id": f"risk-{idx}",
                    "type": "risk",
                    "title": "High risk detected",
                    "message": f"{doc_name} contains elevated contract risk (Score: {int(score)})",
                    "time": format_relative_time(r["created_at"]),
                    "read": False
                })

    # 2. Recently completed documents
    docs_res = supabase_client.table("documents").select("id, name, created_at").eq("status", "completed").order("created_at", desc=True).limit(5).execute()
    if docs_res.data:
        for idx, d in enumerate(docs_res.data):
            notifications.append({
                "id": f"upload-{idx}",
                "type": "upload",
                "title": "Upload complete",
                "message": f"Document {d['name']} has been successfully processed",
                "time": format_relative_time(d["created_at"]),
                "read": False
            })

    # 3. CRM sync logs
    crm_res = supabase_client.table("crm_logs").select("created_at, documents(name)").eq("status", "synced").order("created_at", desc=True).limit(5).execute()
    if crm_res.data:
        for idx, c in enumerate(crm_res.data):
            doc = c.get("documents") or {}
            doc_name = doc.get("name", "Document")
            notifications.append({
                "id": f"crm-{idx}",
                "type": "crm",
                "title": "CRM synced",
                "message": f"{doc_name} pushed to Notion / Records successfully",
                "time": format_relative_time(c["created_at"]),
                "read": True
            })

    contra_res = supabase_client.table("contradictions").select("description, created_at, documents:documents!contradictions_document_id_fkey(name)").order("created_at", desc=True).limit(5).execute()
    if contra_res.data:
        for idx, c in enumerate(contra_res.data):
            doc = c.get("documents") or {}
            doc_name = doc.get("name", "Document")
            notifications.append({
                "id": f"comp-{idx}",
                "type": "comparison",
                "title": "Comparison ready",
                "message": f"Conflict detected in {doc_name}: {c['description']}",
                "time": format_relative_time(c["created_at"]),
                "read": True
            })

    return notifications

@app.get("/api/crm")
async def list_crm_records():
    crm_res = supabase_client.table("crm_logs").select("*, documents(name, doc_type, project_id, file_hash)").order("created_at", desc=True).execute()
    records = []
    
    for r in crm_res.data:
        doc = r.get("documents", {})
        doc_name = doc.get("name", "Unknown")
        doc_type = doc.get("doc_type", "other")
        
        # Fetch entities for vendors/customer
        entities_res = supabase_client.table("entities").select("entity_type, value").eq("document_id", r["document_id"]).execute()
        vendor = "N/A"
        customer = "Internal"
        if entities_res.data:
            vendor = next((e["value"] for e in entities_res.data if e["entity_type"] == "vendor_name"), "N/A")
            customer = next((e["value"] for e in entities_res.data if e["entity_type"] == "customer_name"), "Internal")
            
        # Fetch risk level
        risk_res = supabase_client.table("risk_scores").select("overall_score, explanation").eq("document_id", r["document_id"]).execute()
        overall_score = risk_res.data[0]["overall_score"] if risk_res.data else 0
        risk_level = "low"
        if overall_score > 70:
            risk_level = "high"
        elif overall_score > 30:
            risk_level = "medium"
            
        # Fetch anomalies list
        anomalies_res = supabase_client.table("anomalies").select("description").eq("document_id", r["document_id"]).execute()
        issues = [a["description"] for a in anomalies_res.data] if anomalies_res.data else []

        records.append({
            "id": r["document_id"],
            "document": doc_name,
            "vendor": vendor,
            "customer": customer,
            "type": doc_type.replace("_", " ").title(),
            "risk": risk_level,
            "status": r["status"],
            "processedDate": format_relative_time(r["last_attempt"] or r["created_at"]),
            "summary": risk_res.data[0]["explanation"] if risk_res.data else "",
            "issues": issues
        })
        
    return records

@app.get("/api/sync-status")
async def get_sync_status():
    """Diagnostic endpoint to check Notion sync status"""
    try:
        # Check Notion token
        notion_configured = bool(settings.NOTION_TOKEN)
        
        # Get sync statistics
        crm_res = supabase_client.table("crm_logs").select("status").execute()
        stats = {
            "synced": 0,
            "failed": 0,
            "pending": 0,
            "total": 0
        }
        
        if crm_res.data:
            stats["total"] = len(crm_res.data)
            for log in crm_res.data:
                status = log.get("status", "pending")
                if status in stats:
                    stats[status] += 1
        
        # Get failed syncs with details
        failed_logs = supabase_client.table("crm_logs").select("*, documents(name)").eq("status", "failed").limit(5).execute()
        failed_syncs = []
        if failed_logs.data:
            for log in failed_logs.data:
                doc_name = log.get("documents", {}).get("name", "Unknown") if log.get("documents") else "Unknown"
                failed_syncs.append({
                    "document_id": log["document_id"],
                    "document_name": doc_name,
                    "error": log.get("error_message", "Unknown error")[:200],
                    "last_attempt": log.get("last_attempt"),
                    "retry_count": log.get("retry_count", 0)
                })
        
        # Get pending documents (completed but not synced)
        docs_res = supabase_client.table("documents").select("id").eq("status", "completed").execute()
        synced_docs = set()
        if crm_res.data:
            synced_docs = {log["document_id"] for log in crm_res.data if log.get("status") == "synced"}
        
        pending_sync_count = sum(1 for doc in (docs_res.data or []) if doc["id"] not in synced_docs)
        
        return {
            "notion_configured": notion_configured,
            "statistics": stats,
            "pending_sync_count": pending_sync_count,
            "failed_syncs": failed_syncs,
            "health": {
                "syncing": stats["synced"] > 0 or stats["failed"] == 0,
                "message": "Notion sync is operational" if notion_configured else "Notion token not configured"
            }
        }
    except Exception as e:
        logger.error(f"Sync status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crm/{document_id}")
async def get_crm_record(document_id: str):
    crm_res = supabase_client.table("crm_logs").select("*, documents(name, doc_type, project_id, file_hash, file_path)").eq("document_id", document_id).execute()
    if not crm_res.data:
        raise HTTPException(status_code=404, detail="CRM record not found.")
    
    r = crm_res.data[0]
    doc = r.get("documents", {})
    doc_name = doc.get("name", "Unknown")
    doc_type = doc.get("doc_type", "other")
    
    file_path = doc.get("file_path", "")
    file_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/contracts/{file_path}" if file_path else None
    
    # Fetch entities for vendors/customer
    entities_res = supabase_client.table("entities").select("entity_type, value").eq("document_id", r["document_id"]).execute()
    vendor = "N/A"
    customer = "Internal"
    if entities_res.data:
        vendor = next((e["value"] for e in entities_res.data if e["entity_type"] == "vendor_name"), "N/A")
        customer = next((e["value"] for e in entities_res.data if e["entity_type"] == "customer_name"), "Internal")
        
    # Fetch risk level
    risk_res = supabase_client.table("risk_scores").select("overall_score, explanation").eq("document_id", r["document_id"]).execute()
    overall_score = risk_res.data[0]["overall_score"] if risk_res.data else 0
    risk_level = "low"
    if overall_score > 70:
        risk_level = "high"
    elif overall_score > 30:
        risk_level = "medium"
        
    # Fetch anomalies list
    anomalies_res = supabase_client.table("anomalies").select("description").eq("document_id", r["document_id"]).execute()
    issues = [a["description"] for a in anomalies_res.data] if anomalies_res.data else []

    return {
        "id": r["document_id"],
        "document": doc_name,
        "vendor": vendor,
        "customer": customer,
        "type": doc_type.replace("_", " ").title(),
        "risk": risk_level,
        "status": r["status"],
        "processedDate": format_relative_time(r["last_attempt"] or r["created_at"]),
        "summary": risk_res.data[0]["explanation"] if risk_res.data else "",
        "issues": issues,
        "notion_page_id": r.get("notion_page_id"),
        "error_message": r.get("error_message"),
        "file_url": file_url
    }


# --- WEBSOCKETS ---

@app.websocket("/api/pipeline/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(project_id, websocket)
    try:
        while True:
            # Keep-alive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
