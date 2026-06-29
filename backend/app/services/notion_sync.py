import logging
import httpx
from datetime import datetime
from app.core.config import settings
from app.core.security import supabase_client

logger = logging.getLogger(__name__)

NOTION_HEADERS = {
    "Authorization": f"Bearer {settings.NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

async def get_or_create_notion_database() -> str:
    """
    Searches for an existing database shared with the integration.
    If none is found, searches for a shared page and creates a 'SKYNET Records' database under it.
    Returns:
        database_id (str): The ID of the database to sync records into.
    """
    async with httpx.AsyncClient() as client:
        # 1. Search for databases
        search_db_payload = {
            "filter": {
                "value": "database",
                "property": "object"
            }
        }
        res = await client.post("https://api.notion.com/v1/search", json=search_db_payload, headers=NOTION_HEADERS)
        if res.status_code == 200:
            results = res.json().get("results", [])
            if results:
                # Return the first database found
                db_id = results[0]["id"]
                logger.info(f"Found existing Notion database: {db_id}")
                return db_id
        
        # 2. Search for pages if no database is found
        search_page_payload = {
            "filter": {
                "value": "page",
                "property": "object"
            }
        }
        res_page = await client.post("https://api.notion.com/v1/search", json=search_page_payload, headers=NOTION_HEADERS)
        if res_page.status_code == 200:
            pages = res_page.json().get("results", [])
            if pages:
                parent_page_id = pages[0]["id"]
                logger.info(f"Found shared parent page {parent_page_id}. Creating new database...")
                
                # Create a database under this page
                db_payload = {
                    "parent": {
                        "type": "page_id",
                        "page_id": parent_page_id
                    },
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": "SKYNET Document Records"
                            }
                        }
                    ],
                    "properties": {
                        "Name": {
                            "title": {}
                        },
                        "Type": {
                            "select": {
                                "options": [
                                    {"name": "contract", "color": "blue"},
                                    {"name": "invoice", "color": "green"},
                                    {"name": "financial_statement", "color": "orange"},
                                    {"name": "nda", "color": "purple"},
                                    {"name": "rfp", "color": "yellow"},
                                    {"name": "other", "color": "default"}
                                ]
                            }
                        },
                        "Parties": {
                            "rich_text": {}
                        },
                        "Risk Score": {
                            "number": {"format": "percent"}
                        },
                        "Anomalies Count": {
                            "number": {"format": "number"}
                        },
                        "Content Hash": {
                            "rich_text": {}
                        },
                        "Link": {
                            "url": {}
                        }
                    }
                }
                res_create = await client.post("https://api.notion.com/v1/databases", json=db_payload, headers=NOTION_HEADERS)
                if res_create.status_code == 200:
                    new_db_id = res_create.json()["id"]
                    logger.info(f"Created new database in Notion: {new_db_id}")
                    return new_db_id
                else:
                    logger.error(f"Failed to create Notion database: {res_create.text}")
                    
    raise ValueError("No shared databases or pages found in Notion. Please share a page or database with the integration.")

async def sync_document_to_notion(document_id: str) -> dict:
    """
    Pushes document metadata to Notion. If content hash already exists, it updates it.
    """
    # 1. Fetch document and related details from Supabase
    doc_res = supabase_client.table("documents").select("*").eq("id", document_id).execute()
    if not doc_res.data:
        raise ValueError(f"Document {document_id} not found.")
    doc = doc_res.data[0]
    
    anomalies_res = supabase_client.table("anomalies").select("id").eq("document_id", document_id).execute()
    anomaly_count = len(anomalies_res.data) if anomalies_res.data else 0
    
    risk_res = supabase_client.table("risk_scores").select("overall_score").eq("document_id", document_id).execute()
    risk_score = risk_res.data[0]["overall_score"] / 100.0 if risk_res.data else 0.0
    
    parties_res = supabase_client.table("entities").select("value").eq("document_id", document_id).eq("entity_type", "party").execute()
    parties_list = [p["value"] for p in parties_res.data] if parties_res.data else []
    parties_str = ", ".join(parties_list)

    # 2. Get or create target database
    database_id = await get_or_create_notion_database()
    
    # 3. Check if document has already been synced or content hash exists
    crm_res = supabase_client.table("crm_logs").select("*").eq("document_id", document_id).execute()
    notion_page_id = None
    
    if crm_res.data:
        notion_page_id = crm_res.data[0].get("notion_page_id")
        
    # If not synced yet, check by document name in Notion database
    if not notion_page_id:
        async with httpx.AsyncClient() as client:
            query_payload = {
                "filter": {
                    "property": "Task",
                    "title": {
                        "contains": doc.get("name", "")[:50]
                    }
                }
            }
            res_query = await client.post(f"https://api.notion.com/v1/databases/{database_id}/query", json=query_payload, headers=NOTION_HEADERS)
            if res_query.status_code == 200:
                results = res_query.json().get("results", [])
                if results:
                    notion_page_id = results[0]["id"]
                    logger.info(f"Found existing Notion page by file hash: {notion_page_id}")

    # 4. Prepare properties payload - Map to Tasks database schema
    doc_link = f"http://localhost:5173/projects/{doc['project_id']}?tab=documents"
    
    # Determine priority from risk score
    if risk_score >= 0.8:
        priority = "High"
    elif risk_score >= 0.5:
        priority = "Medium"
    else:
        priority = "Low"
    
    properties = {
        "Task": {
            "title": [
                {
                    "text": {
                        "content": doc.get("name", "Document")
                    }
                }
            ]
        },
        "Status": {
            "status": {
                "name": "In Progress"
            }
        },
        "Priority": {
            "select": {
                "name": priority
            }
        },
        "Tags": {
            "multi_select": [
                {
                    "name": doc.get("doc_type", "other").capitalize()
                }
            ]
        },
        "Notes": {
            "rich_text": [
                {
                    "text": {
                        "content": f"Anomalies: {anomaly_count} | Risk: {risk_score*100:.0f}% | Parties: {parties_str[:100]}"[:2000]
                    }
                }
            ]
        }
    }

    # 5. Push to Notion (Insert or Update)
    async with httpx.AsyncClient() as client:
        if notion_page_id:
            # Update existing page
            url = f"https://api.notion.com/v1/pages/{notion_page_id}"
            res = await client.patch(url, json={"properties": properties}, headers=NOTION_HEADERS)
        else:
            # Create new page
            url = "https://api.notion.com/v1/pages"
            payload = {
                "parent": {
                    "database_id": database_id
                },
                "properties": properties
            }
            res = await client.post(url, json=payload, headers=NOTION_HEADERS)
            
        if res.status_code in [200, 201]:
            notion_page_id = res.json()["id"]
            # Save or update CRM logs in Supabase
            crm_log_data = {
                "document_id": document_id,
                "status": "synced",
                "notion_page_id": notion_page_id,
                "error_message": None,
                "retry_count": 0,
                "last_attempt": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat()
            }
            if crm_res.data:
                supabase_client.table("crm_logs").update({
                    "status": "synced",
                    "notion_page_id": notion_page_id,
                    "error_message": None,
                    "last_attempt": datetime.utcnow().isoformat()
                }).eq("document_id", document_id).execute()
            else:
                supabase_client.table("crm_logs").insert(crm_log_data).execute()
                
            logger.info(f"Synced document {document_id} to Notion successfully!")
            return {"status": "synced", "page_id": notion_page_id}
        else:
            error_msg = f"Notion API error ({res.status_code}): {res.text}"
            logger.error(error_msg)
            # Log failure
            if crm_res.data:
                supabase_client.table("crm_logs").update({
                    "status": "failed",
                    "error_message": error_msg,
                    "retry_count": crm_res.data[0].get("retry_count", 0) + 1,
                    "last_attempt": datetime.utcnow().isoformat()
                }).eq("document_id", document_id).execute()
            else:
                supabase_client.table("crm_logs").insert({
                    "document_id": document_id,
                    "status": "failed",
                    "error_message": error_msg,
                    "retry_count": 1,
                    "last_attempt": datetime.utcnow().isoformat(),
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            raise RuntimeError(error_msg)
