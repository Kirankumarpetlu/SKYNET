import json
import logging
import asyncio
import httpx
import uuid
from datetime import datetime
from app.core.config import settings
from app.core.security import supabase_client

logger = logging.getLogger(__name__)

# WebSocket registry to broadcast updates in real time
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list] = {}  # key is project_id

    async def connect(self, project_id: str, websocket):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        logger.info(f"WS client connected to project {project_id}")

    def disconnect(self, project_id: str, websocket):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
        logger.info(f"WS client disconnected from project {project_id}")

    async def broadcast(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            dead_connections = []
            for ws in self.active_connections[project_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send WS message: {e}")
                    dead_connections.append(ws)
            for ws in dead_connections:
                self.disconnect(project_id, ws)

manager = ConnectionManager()

async def call_groq_json(prompt: str, system_prompt: str = "You are a helpful contract intelligence and document analysis assistant.") -> dict:
    """Helper to query Groq LLM in JSON mode."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt + " Return your response as a raw JSON object only. Do not include markdown code block formatting (like ```json)."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }
    
    async with httpx.AsyncClient() as client:
        for attempt in range(3):
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=60.0)
                if response.status_code == 200:
                    res_json = response.json()
                    content = res_json["choices"][0]["message"]["content"].strip()
                    # Strip markdown block formatting if LLM didn't respect instruction
                    if content.startswith("```"):
                        content = content.replace("```json", "").replace("```", "").strip()
                    return json.loads(content)
                else:
                    logger.error(f"Groq API error ({response.status_code}): {response.text}")
            except Exception as e:
                logger.error(f"Groq API connection attempt {attempt+1} failed: {e}")
            await asyncio.sleep(1.0)
            
    raise RuntimeError("Failed to obtain a valid JSON response from Groq API.")

async def process_document_pipeline(document_id: str, project_id: str):
    """
    Runs the 5-stage CPU-bound pipeline on a document and streams progress via WebSockets.
    """
    logger.info(f"Starting pipeline for document: {document_id}")
    
    # Create a pipeline job record
    job_id = str(uuid.uuid4())
    job_data = {
        "id": job_id,
        "document_id": document_id,
        "status": "processing",
        "current_stage": "ingestion",
        "progress": 10.0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    supabase_client.table("pipeline_jobs").insert(job_data).execute()

    async def log_stage(stage: str, progress: float, message: str, data: dict = None):
        """Update job progress and broadcast via WS."""
        # Update Job in Supabase
        supabase_client.table("pipeline_jobs").update({
            "current_stage": stage,
            "progress": progress,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()
        
        # Insert log
        supabase_client.table("processing_logs").insert({
            "job_id": job_id,
            "stage": stage,
            "message": message,
            "log_level": "info",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        # Broadcast WS event
        ws_payload = {
            "document_id": document_id,
            "project_id": project_id,
            "stage": stage,
            "progress": progress,
            "message": message,
            "status": "processing" if progress < 100.0 else "completed",
            "data": data
        }
        await manager.broadcast(project_id, ws_payload)
        await asyncio.sleep(0.5) # Allow smooth frontend progression

    try:
        # Get document from DB
        doc_res = supabase_client.table("documents").select("content, name").eq("id", document_id).execute()
        if not doc_res.data:
            raise ValueError("Document not found in DB.")
        
        doc = doc_res.data[0]
        content = doc.get("content", "")
        doc_name = doc.get("name", "")
        
        if not content:
            raise ValueError("Document text content is empty.")

        # --- STAGE 1: Classification ---
        await log_stage("classification", 20.0, "Classifying document type and mapping header metadata...")
        
        system_prompt_1 = "You are a professional document classifier and metadata extractor."
        prompt_1 = (
            "Analyze this document's text and extract the metadata.\n"
            "Classification types: 'contract', 'invoice', 'financial_statement', 'rfp', 'nda', 'other'.\n"
            "Return a JSON object with this schema:\n"
            "{\n"
            "  \"doc_type\": \"contract|invoice|financial_statement|rfp|nda|other\",\n"
            "  \"primary_parties\": [\"Party A\", \"Party B\"],\n"
            "  \"effective_date\": \"YYYY-MM-DD or null\",\n"
            "  \"governing_law\": \"State/Country or null\"\n"
            "}\n\n"
            f"Document Text:\n{content[:8000]}"
        )
        
        stage1_res = await call_groq_json(prompt_1, system_prompt_1)
        doc_type = stage1_res.get("doc_type", "other")
        
        # Save classification back to document table
        supabase_client.table("documents").update({
            "doc_type": doc_type,
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", document_id).execute()
        
        # Save parties as entities in the DB
        for party in (stage1_res.get("primary_parties") or []):
            supabase_client.table("entities").insert({
                "document_id": document_id,
                "entity_type": "party",
                "value": party,
                "confidence": 1.0,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            
        if stage1_res.get("effective_date"):
            supabase_client.table("entities").insert({
                "document_id": document_id,
                "entity_type": "effective_date",
                "value": stage1_res["effective_date"],
                "confidence": 1.0,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            
        if stage1_res.get("governing_law"):
            supabase_client.table("entities").insert({
                "document_id": document_id,
                "entity_type": "governing_law",
                "value": stage1_res["governing_law"],
                "confidence": 1.0,
                "created_at": datetime.utcnow().isoformat()
            }).execute()

        await log_stage("classification", 35.0, f"Classified document as {doc_type.upper()}.", stage1_res)

        # --- STAGE 2: Entity & Clause Extraction ---
        await log_stage("extraction", 45.0, "Extracting clauses and structured business values...")
        
        system_prompt_2 = "You are a professional legal auditor and data extractor."
        if doc_type in ["contract", "nda"]:
            prompt_2 = (
                "Extract standard clauses and terms from this agreement.\n"
                "Return a JSON object containing a list of clauses with this exact schema:\n"
                "{\n"
                "  \"clauses\": [\n"
                "    {\n"
                "      \"clause_type\": \"payment_terms|termination|liability_cap|ip_assignment|non_compete|confidentiality|indemnification\",\n"
                "      \"text\": \"original clause text matching the document\",\n"
                "      \"explanation\": \"summary of the clause in plain English\",\n"
                "      \"risk_level\": \"low|medium|high\"\n"
                "    }\n"
                "  ]\n"
                "}\n\n"
                f"Document Text:\n{content[:15000]}"
            )
        elif doc_type == "invoice":
            prompt_2 = (
                "Extract structured billing fields and line items from this invoice.\n"
                "Return a JSON object with this exact schema:\n"
                "{\n"
                "  \"vendor_name\": \"Vendor Corp or null\",\n"
                "  \"total_amount\": 1234.56,\n"
                "  \"tax_amount\": 123.45,\n"
                "  \"due_date\": \"YYYY-MM-DD or null\",\n"
                "  \"line_items\": [\n"
                "    {\n"
                "      \"description\": \"Item description\",\n"
                "      \"quantity\": 1.0,\n"
                "      \"unit_price\": 100.00,\n"
                "      \"total_price\": 100.00\n"
                "    }\n"
                "  ]\n"
                "}\n\n"
                f"Document Text:\n{content[:10000]}"
            )
        else: # Financial statement or other
            prompt_2 = (
                "Extract key financial performance metrics from this document.\n"
                "Return a JSON object with this exact schema:\n"
                "{\n"
                "  \"reporting_period\": \"Q3 2024 or FY 2024\",\n"
                "  \"metrics\": [\n"
                "    {\n"
                "      \"metric_name\": \"Revenue|Gross Profit|Net Income|Operating Expense\",\n"
                "      \"value\": 1000000.00,\n"
                "      \"currency\": \"USD\"\n"
                "    }\n"
                "  ]\n"
                "}\n\n"
                f"Document Text:\n{content[:10000]}"
            )
            
        stage2_res = await call_groq_json(prompt_2, system_prompt_2)
        
        # Save clauses/items to database
        if doc_type in ["contract", "nda"]:
            for clause in (stage2_res.get("clauses") or []):
                supabase_client.table("clauses").insert({
                    "document_id": document_id,
                    "clause_type": clause.get("clause_type"),
                    "text": clause.get("text"),
                    "explanation": clause.get("explanation"),
                    "risk_level": clause.get("risk_level", "low"),
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
        elif doc_type == "invoice":
            # Save invoice fields as general entities
            supabase_client.table("entities").insert({
                "document_id": document_id,
                "entity_type": "vendor_name",
                "value": str(stage2_res.get("vendor_name", "Unknown")),
                "confidence": 1.0,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            supabase_client.table("entities").insert({
                "document_id": document_id,
                "entity_type": "invoice_total",
                "value": str(stage2_res.get("total_amount", 0.0)),
                "confidence": 1.0,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            # Save line items as a clause or JSON field
            supabase_client.table("clauses").insert({
                "document_id": document_id,
                "clause_type": "invoice_line_items",
                "text": json.dumps(stage2_res.get("line_items") or []),
                "explanation": f"Line items count: {len(stage2_res.get('line_items') or [])}",
                "risk_level": "low",
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        else:
            # Financial statement
            supabase_client.table("entities").insert({
                "document_id": document_id,
                "entity_type": "reporting_period",
                "value": str(stage2_res.get("reporting_period", "Unknown")),
                "confidence": 1.0,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            # Save metrics
            for metric in (stage2_res.get("metrics") or []):
                supabase_client.table("entities").insert({
                    "document_id": document_id,
                    "entity_type": f"metric_{metric.get('metric_name')}",
                    "value": str(metric.get("value", 0.0)),
                    "confidence": 1.0,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
                
        await log_stage("extraction", 60.0, f"Extracted structured fields for {doc_type.upper()}.", stage2_res)

        # --- STAGE 3: Anomaly Detection ---
        await log_stage("anomalies", 75.0, "Analyzing parameters for contract risks and financial anomalies...")
        
        system_prompt_3 = "You are a professional auditor that identifies legal contract risks and financial anomalies."
        # Generate custom prompt detailing rules based on type
        prompt_3 = (
            f"Review this document metadata and data extracted in Stage 2 to detect anomalies.\n"
            f"Document Type: {doc_type}\n"
            f"Extracted Data:\n{json.dumps(stage2_res)}\n\n"
            "Apply the following rules for anomalies:\n"
            "- Contracts: payment terms > 90 days, notice periods < 90 days, missing standard clauses (confidentiality, ip_assignment, indemnification), liability cap < 1 year fee.\n"
            "- Invoices: line items that do not add up mathematically to total, duplicate lines, due dates in the past.\n"
            "- Financial Statements: extreme YoY changes (>30%), negative gross profit or net margins, unrealistic ratios.\n"
            "Return a JSON object containing a list of anomalies with this exact schema:\n"
            "{\n"
            "  \"anomalies\": [\n"
            "    {\n"
            "      \"type\": \"payment_terms_over_90|math_mismatch|missing_confidentiality|negative_profit_margin|etc\",\n"
            "      \"description\": \"Detailed description of the anomaly in plain English\",\n"
            "      \"severity\": \"critical|warning|info\"\n"
            "    }\n"
            "  ]\n"
            "}\n"
        )
        
        stage3_res = await call_groq_json(prompt_3, system_prompt_3)
        anomalies_list = stage3_res.get("anomalies") or []
        
        for anomaly in anomalies_list:
            supabase_client.table("anomalies").insert({
                "document_id": document_id,
                "type": anomaly.get("type"),
                "description": anomaly.get("description"),
                "severity": anomaly.get("severity", "warning"),
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            
        await log_stage("anomalies", 85.0, f"Detected {len(anomalies_list)} anomalies.", stage3_res)

        # --- STAGE 4: Risk Scoring ---
        await log_stage("risk_scoring", 90.0, "Aggregating findings into normalized risk index...")
        
        # Calculate Risk Score
        prompt_4 = (
            f"Review these detected anomalies for the document:\n{json.dumps(anomalies_list)}\n"
            "Calculate an overall risk score from 0 to 100 (where 0 is no risk, and 100 is critical danger/unacceptable terms).\n"
            "Provide category breakdown scores (0-100) for: 'legal', 'financial', 'operational'.\n"
            "Return a JSON object with this exact schema:\n"
            "{\n"
            "  \"overall_score\": 72.5,\n"
            "  \"risk_breakdown\": {\n"
            "    \"legal\": 80.0,\n"
            "    \"financial\": 50.0,\n"
            "    \"operational\": 40.0\n"
            "  },\n"
            "  \"explanation\": \"Detailed summary explanation of the risk profile\"\n"
            "}\n"
        )
        
        stage4_res = await call_groq_json(prompt_4, system_prompt_3)
        
        supabase_client.table("risk_scores").insert({
            "document_id": document_id,
            "overall_score": float(stage4_res.get("overall_score", 0.0)),
            "risk_breakdown": stage4_res.get("risk_breakdown", {}),
            "explanation": stage4_res.get("explanation", ""),
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        await log_stage("risk_scoring", 95.0, f"Calculated risk score: {stage4_res.get('overall_score')}%", stage4_res)

        # --- STAGE 5: Cross-Document Contradiction Detection ---
        # Get other documents in the same project to check for contradictions
        other_docs_res = supabase_client.table("documents").select("id, name, content, doc_type").eq("project_id", project_id).neq("id", document_id).execute()
        
        if other_docs_res.data:
            await log_stage("contradictions", 98.0, "Cross-referencing parameters with other project documents...")
            other_docs_summaries = []
            for od in other_docs_res.data:
                # Fetch details (clauses/entities) for the other document to build a summary
                entities_res = supabase_client.table("entities").select("entity_type, value").eq("document_id", od["id"]).execute()
                clauses_res = supabase_client.table("clauses").select("clause_type, text, explanation").eq("document_id", od["id"]).execute()
                
                other_docs_summaries.append({
                    "id": od["id"],
                    "name": od["name"],
                    "doc_type": od["doc_type"],
                    "entities": entities_res.data,
                    "clauses": clauses_res.data
                })
                
            prompt_5 = (
                f"Compare the current document: '{doc_name}' (type: {doc_type}) with the other documents in the project.\n"
                f"Current Doc Data:\n{json.dumps(stage2_res)}\n\n"
                f"Other Project Documents:\n{json.dumps(other_docs_summaries)}\n\n"
                "Look for contradictions such as:\n"
                "- Mismatched payment terms (e.g. Master Agreement Net 30 vs Invoice Net 60)\n"
                "- Billing discrepancies (e.g. Invoice amount doesn't correspond to Contract rates)\n"
                "- Term or termination discrepancies\n"
                "- Conflicting governing jurisdictions\n"
                "Return a JSON object containing a list of contradictions with this exact schema:\n"
                "{\n"
                "  \"contradictions\": [\n"
                "    {\n"
                "      \"target_document_id\": \"id_of_contradicting_doc\",\n"
                "      \"description\": \"Description of the contradiction. Show side by side conflict e.g. Contract specifies 30 days but Invoice specifies 60 days.\",\n"
                "      \"severity\": \"critical|warning\"\n"
                "    }\n"
                "  ]\n"
                "}\n"
            )
            
            stage5_res = await call_groq_json(prompt_5, system_prompt_3)
            contradictions_list = stage5_res.get("contradictions", [])
            
            for contradiction in contradictions_list:
                supabase_client.table("contradictions").insert({
                    "document_id": document_id,
                    "target_document_id": contradiction.get("target_document_id"),
                    "description": contradiction.get("description"),
                    "severity": contradiction.get("severity", "warning"),
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
                
            await log_stage("contradictions", 100.0, f"Contradiction detection complete. Found {len(contradictions_list)} contradictions.", stage5_res)
        else:
            await log_stage("contradictions", 100.0, "Contradiction detection skipped (single document).")

        # --- STAGE 6: CRM Sync ---
        await log_stage("crm", 99.0, "Syncing document metadata to CRM/Notion records...")
        try:
            from app.services.notion_sync import sync_document_to_notion
            await sync_document_to_notion(document_id)
            await log_stage("crm", 100.0, "CRM Sync completed successfully!")
        except Exception as sync_err:
            logger.error(f"CRM Sync failed during pipeline: {sync_err}")
            crm_res = supabase_client.table("crm_logs").select("*").eq("document_id", document_id).execute()
            if not crm_res.data:
                supabase_client.table("crm_logs").insert({
                    "document_id": document_id,
                    "status": "failed",
                    "error_message": str(sync_err),
                    "retry_count": 0,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            await log_stage("crm", 100.0, f"CRM Sync failed: {sync_err}")

        # Update document status to completed
        supabase_client.table("documents").update({
            "status": "completed",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", document_id).execute()

        # Update pipeline job status
        supabase_client.table("pipeline_jobs").update({
            "status": "completed",
            "progress": 100.0,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()

    except Exception as e:
        logger.error(f"Error in pipeline job for document {document_id}: {e}")
        # Update job error message
        supabase_client.table("pipeline_jobs").update({
            "status": "failed",
            "error_message": str(e),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()

        # Update document status to failed
        supabase_client.table("documents").update({
            "status": "failed",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", document_id).execute()

        # Insert error log
        supabase_client.table("processing_logs").insert({
            "job_id": job_id,
            "stage": "error",
            "message": f"Pipeline failed: {e}",
            "log_level": "error",
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        # Broadcast fail status
        ws_payload = {
            "document_id": document_id,
            "project_id": project_id,
            "stage": "error",
            "progress": 100.0,
            "message": f"Pipeline failed: {e}",
            "status": "failed",
            "data": None
        }
        await manager.broadcast(project_id, ws_payload)
