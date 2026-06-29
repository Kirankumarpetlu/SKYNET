import logging
import json
import uuid
from datetime import datetime
from app.core.config import settings
from app.core.security import supabase_client
from app.services.pipeline import call_groq_json

logger = logging.getLogger(__name__)

def is_project_insights_question(question: str) -> bool:
    """Check if the question is asking about project insights/statistics"""
    keywords = [
        "project insight", "project summary", "project overview",
        "statistics", "summary", "overview", "status",
        "how many document", "document count", "document total",
        "processing", "in pipeline", "completed",
        "risk", "anomal", "critical", "warning", "issue",
        "health", "status overview"
    ]
    q_lower = question.lower()
    return any(keyword in q_lower for keyword in keywords)

async def get_project_insights(project_id: str) -> dict:
    """Fetch comprehensive project insights and statistics"""
    try:
        # Fetch documents
        docs_res = supabase_client.table("documents").select("id, status").eq("project_id", project_id).execute()
        documents = docs_res.data or []
        
        # Count by status
        completed = sum(1 for d in documents if d.get("status") == "completed")
        processing = sum(1 for d in documents if d.get("status") == "processing")
        failed = sum(1 for d in documents if d.get("status") == "failed")
        total = len(documents)
        
        # Fetch risk scores
        doc_ids = [d["id"] for d in documents]
        risk_res = supabase_client.table("risk_scores").select("overall_score").in_("document_id", doc_ids).execute()
        avg_risk = 0
        if risk_res.data:
            avg_risk = int(sum(r["overall_score"] for r in risk_res.data) / len(risk_res.data))
        
        # Fetch anomalies
        anomalies_res = supabase_client.table("anomalies").select("severity").in_("document_id", doc_ids).execute()
        anomalies = anomalies_res.data or []
        critical_count = sum(1 for a in anomalies if a.get("severity") == "critical")
        warning_count = sum(1 for a in anomalies if a.get("severity") == "warning")
        
        # Fetch contradictions
        contradictions_res = supabase_client.table("contradictions").select("id").in_("document_id", doc_ids).execute()
        contradiction_count = len(contradictions_res.data or [])
        
        # Fetch clauses
        clauses_res = supabase_client.table("clauses").select("risk_level").in_("document_id", doc_ids).execute()
        clauses = clauses_res.data or []
        high_risk_clauses = sum(1 for c in clauses if c.get("risk_level") == "high")
        
        return {
            "documents": {
                "total": total,
                "completed": completed,
                "processing": processing,
                "failed": failed
            },
            "risks": {
                "average_score": avg_risk,
                "critical_issues": critical_count,
                "warnings": warning_count
            },
            "findings": {
                "anomalies": len(anomalies),
                "contradictions": contradiction_count,
                "high_risk_clauses": high_risk_clauses
            }
        }
    except Exception as e:
        logger.error(f"Failed to fetch project insights: {e}")
        return None

def format_insights_answer(insights: dict) -> str:
    """Format project insights into a comprehensive analysis with reasoning"""
    if not insights:
        return "Unable to retrieve project insights at this time."
    
    docs = insights.get("documents", {})
    risks = insights.get("risks", {})
    findings = insights.get("findings", {})
    
    total_docs = docs.get("total", 0)
    completed_docs = docs.get("completed", 0)
    processing_docs = docs.get("processing", 0)
    failed_docs = docs.get("failed", 0)
    avg_risk = risks.get("average_score", 0)
    critical_issues = risks.get("critical_issues", 0)
    warnings = risks.get("warnings", 0)
    anomalies = findings.get("anomalies", 0)
    contradictions = findings.get("contradictions", 0)
    high_risk_clauses = findings.get("high_risk_clauses", 0)
    
    # Calculate completion percentage
    completion_pct = int((completed_docs / total_docs * 100)) if total_docs > 0 else 0
    
    # Determine risk level interpretation
    if avg_risk >= 80:
        risk_level = "🔴 **HIGH RISK** - Immediate action required"
        risk_color = "HIGH"
    elif avg_risk >= 60:
        risk_level = "🟠 **MODERATE-HIGH RISK** - Requires attention"
        risk_color = "MODERATE_HIGH"
    elif avg_risk >= 40:
        risk_level = "🟡 **MODERATE RISK** - Monitor closely"
        risk_color = "MODERATE"
    else:
        risk_level = "🟢 **LOW RISK** - Generally safe"
        risk_color = "LOW"
    
    # Build comprehensive answer with reasoning
    answer_parts = [
        "📊 **Project Insights & Detailed Analysis**\n",
        
        "## 📋 Document Processing Status",
        f"**Progress:** {completed_docs}/{total_docs} documents completed ({completion_pct}%)",
        ""
    ]
    
    # Add reasoning about processing status
    if completion_pct == 100:
        answer_parts.append("✅ **Status:** All documents have been successfully processed.")
    elif completion_pct >= 80:
        answer_parts.append(f"⚠️ **Status:** Nearly complete. {processing_docs} document(s) still processing.")
    elif completion_pct >= 50:
        answer_parts.append(f"⏳ **Status:** Processing is in progress. {processing_docs} document(s) remain in the pipeline.")
    else:
        answer_parts.append(f"⏳ **Status:** Early stage processing. {processing_docs} document(s) are being processed.")
    
    if failed_docs > 0:
        answer_parts.append(f"❌ **Alert:** {failed_docs} document(s) failed processing. Review error logs to identify causes.")
    
    answer_parts.extend([
        "",
        "**Breakdown by Status:**",
        f"  • ✅ Completed: {completed_docs}",
        f"  • ⏳ Processing: {processing_docs}",
        f"  • ❌ Failed: {failed_docs}",
        "",
        
        "## 🎯 Risk Assessment & Reasoning",
        f"**Overall Risk Level:** {risk_level}",
        f"**Average Risk Score:** {avg_risk}/100",
        ""
    ])
    
    # Add risk interpretation
    if avg_risk >= 80:
        answer_parts.append("⚠️ This project contains significant risk factors. The average risk score indicates multiple concerning elements that should be addressed urgently. Critical issues detected suggest potential legal, compliance, or operational concerns.")
    elif avg_risk >= 60:
        answer_parts.append("⚠️ The project shows moderate-to-high risk. Several important issues require attention. While not critical, these factors could impact project outcomes or compliance.")
    elif avg_risk >= 40:
        answer_parts.append("ℹ️ The project has moderate risk levels. Maintain vigilance and monitor identified issues. Consider addressing warnings to improve the overall risk profile.")
    else:
        answer_parts.append("✅ The project has a favorable risk profile. Risks are minimal and manageable.")
    
    answer_parts.extend([
        "",
        "**Risk Breakdown:**",
        f"  • 🔴 Critical Issues: {critical_issues} (requires immediate attention)",
        f"  • 🟡 Warnings: {warnings} (monitor and plan mitigation)",
        "",
        
        "## 🔍 Key Findings & Anomalies",
    ])
    
    # Add findings analysis
    if anomalies > 0:
        answer_parts.append(f"**Anomalies Detected:** {anomalies}")
        answer_parts.append("  → These are unusual patterns or outliers in the document content that deviate from expected norms. Review these for accuracy and potential issues.")
    else:
        answer_parts.append("**Anomalies:** None detected ✅")
    
    answer_parts.append("")
    
    if contradictions > 0:
        answer_parts.append(f"**Contradictions Found:** {contradictions}")
        answer_parts.append("  → These indicate conflicting information within or across documents. Reconcile these discrepancies before proceeding.")
    else:
        answer_parts.append("**Contradictions:** None found ✅")
    
    answer_parts.append("")
    
    if high_risk_clauses > 0:
        answer_parts.append(f"**High-Risk Clauses:** {high_risk_clauses}")
        answer_parts.append("  → These are specific clauses or sections flagged as potentially problematic. Review and consider legal/compliance consultation if needed.")
    else:
        answer_parts.append("**High-Risk Clauses:** None identified ✅")
    
    answer_parts.extend([
        "",
        "## 💡 Recommendations",
    ])
    
    # Add contextual recommendations based on data
    recommendations = []
    
    if failed_docs > 0:
        recommendations.append("1. **Investigate Failed Documents** - Review error logs for the failed documents and take corrective action.")
    
    if processing_docs > 0:
        recommendations.append("2. **Monitor Processing Pipeline** - Keep track of documents still in processing and ensure they complete successfully.")
    
    if critical_issues > 0:
        recommendations.append(f"3. **Address Critical Issues** - {critical_issues} critical issue(s) need immediate attention. Prioritize resolution of these items.")
    
    if contradictions > 0:
        recommendations.append(f"4. **Resolve Contradictions** - {contradictions} contradiction(s) found. Clarify conflicting information.")
    
    if high_risk_clauses > 0:
        recommendations.append(f"5. **Review High-Risk Clauses** - {high_risk_clauses} clause(s) pose elevated risk. Consider legal review.")
    
    if not recommendations:
        recommendations.append("✅ No immediate critical actions required. Continue monitoring for any changes.")
    
    answer_parts.extend(recommendations)
    
    return "\n".join(answer_parts)

async def answer_document_question(project_id: str, question: str) -> dict:
    """
    Answers a natural language question about the project's documents.
    Can answer both document-based questions and project insights questions.
    Returns:
        response (dict): Containing 'answer' (str) and 'citations' (list of dict).
    """
    # Check if this is a project insights question
    if is_project_insights_question(question):
        insights = await get_project_insights(project_id)
        if insights:
            answer = format_insights_answer(insights)
            # Save to QA history
            supabase_client.table("qa_history").insert({
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "user_id": None,
                "question": question,
                "answer": answer,
                "citations": [],
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            return {
                "answer": answer,
                "citations": []
            }
    
    # 1. Fetch all documents content in this project
    docs_res = supabase_client.table("documents").select("id, name, content").eq("project_id", project_id).execute()
    if not docs_res.data:
        return {
            "answer": "No documents found in this project. Please upload documents first.",
            "citations": []
        }
        
    context_parts = []
    for doc in docs_res.data:
        doc_name = doc.get("name", "Document")
        content = doc.get("content", "")
        if content:
            context_parts.append(f"=== DOCUMENT: {doc_name} (ID: {doc['id']}) ===\n{content}\n")
            
    full_context = "\n".join(context_parts)
    
    # 2. Build the QA prompt
    system_prompt = "You are a helpful QA assistant that answers user questions about business documents using provided context."
    prompt = (
        "Answer the following question based ONLY on the provided document context.\n"
        "If the answer cannot be found in the context, say 'I cannot find the answer in the uploaded documents.'\n"
        "Provide a precise plain-English answer and include citations pointing to the exact clause, paragraph, or table cell.\n\n"
        "Return a JSON object with this exact schema:\n"
        "{\n"
        "  \"answer\": \"Detailed plain English answer to the question.\",\n"
        "  \"citations\": [\n"
        "    {\n"
        "      \"document_name\": \"Name of the document cited\",\n"
        "      \"source\": \"Section Title, Clause 4, or Table Cell reference\",\n"
        "      \"quote\": \"The exact quoted text from the document containing the answer\"\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        f"Context:\n{full_context[:25000]}\n\n" # Safe limit for Llama-3.3-70b
        f"Question:\n{question}"
    )
    
    try:
        qa_res = await call_groq_json(prompt, system_prompt)
        
        # Save to qa_history in Supabase
        supabase_client.table("qa_history").insert({
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "user_id": None, # Unauthenticated session
            "question": question,
            "answer": qa_res.get("answer", ""),
            "citations": qa_res.get("citations", []),
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        return qa_res
    except Exception as e:
        logger.error(f"QA engine failure: {e}")
        return {
            "answer": f"Error querying document assistant: {e}",
            "citations": []
        }
