#!/usr/bin/env python3
"""
Notion Sync Diagnostic Script
Checks the status of document syncing with Notion
"""

import sys
import logging
from datetime import datetime
from app.core.config import settings
from app.core.security import supabase_client

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def check_notion_token():
    """Check if Notion token is configured"""
    logger.info("=" * 60)
    logger.info("1. CHECKING NOTION TOKEN CONFIGURATION")
    logger.info("=" * 60)
    
    if not settings.NOTION_TOKEN:
        logger.error("❌ NOTION_TOKEN is not configured!")
        logger.info("   Action: Set NOTION_TOKEN in your .env file")
        return False
    else:
        logger.info("✓ NOTION_TOKEN is configured")
        token_preview = settings.NOTION_TOKEN[:20] + "..." if len(settings.NOTION_TOKEN) > 20 else settings.NOTION_TOKEN
        logger.info(f"   Token preview: {token_preview}")
        return True

def check_crm_logs_table():
    """Check CRM logs for sync status"""
    logger.info("\n" + "=" * 60)
    logger.info("2. CHECKING CRM LOGS TABLE")
    logger.info("=" * 60)
    
    try:
        crm_res = supabase_client.table("crm_logs").select("*").order("created_at", desc=True).limit(20).execute()
        
        if not crm_res.data:
            logger.warning("⚠ No CRM logs found. No documents have been synced yet.")
            return True
        
        logger.info(f"✓ Found {len(crm_res.data)} CRM log entries:")
        
        # Count by status
        synced_count = sum(1 for log in crm_res.data if log.get("status") == "synced")
        failed_count = sum(1 for log in crm_res.data if log.get("status") == "failed")
        pending_count = sum(1 for log in crm_res.data if log.get("status") == "pending")
        
        logger.info(f"   ✓ Synced:  {synced_count}")
        logger.info(f"   ✗ Failed:  {failed_count}")
        logger.info(f"   ⏱ Pending: {pending_count}")
        
        # Show recent entries
        logger.info("\nRecent Sync Attempts (Last 5):")
        for i, log in enumerate(crm_res.data[:5], 1):
            doc_res = supabase_client.table("documents").select("name").eq("id", log["document_id"]).execute()
            doc_name = doc_res.data[0]["name"] if doc_res.data else "Unknown"
            
            status = log.get("status", "unknown")
            last_attempt = log.get("last_attempt", "N/A")
            
            status_icon = "✓" if status == "synced" else "✗" if status == "failed" else "⏱"
            
            logger.info(f"\n   {i}. [{status_icon}] {doc_name}")
            logger.info(f"      Status: {status}")
            logger.info(f"      Last Attempt: {last_attempt}")
            
            if status == "failed":
                error_msg = log.get("error_message", "No error message")
                logger.error(f"      Error: {error_msg[:150]}")
            
            if log.get("notion_page_id"):
                logger.info(f"      Notion Page ID: {log.get('notion_page_id')}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to check CRM logs: {str(e)}")
        return False

def check_documents_status():
    """Check document processing status"""
    logger.info("\n" + "=" * 60)
    logger.info("3. CHECKING DOCUMENT PROCESSING STATUS")
    logger.info("=" * 60)
    
    try:
        docs_res = supabase_client.table("documents").select("id, name, status").execute()
        
        if not docs_res.data:
            logger.warning("⚠ No documents found in the database.")
            return True
        
        # Count by status
        statuses = {}
        for doc in docs_res.data:
            status = doc.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        
        logger.info(f"✓ Found {len(docs_res.data)} documents:")
        for status, count in statuses.items():
            logger.info(f"   {status}: {count}")
        
        # Show documents waiting for sync
        logger.info("\nDocuments Pending Sync (not yet synced):")
        synced_docs = set()
        crm_res = supabase_client.table("crm_logs").select("document_id").eq("status", "synced").execute()
        if crm_res.data:
            synced_docs = {log["document_id"] for log in crm_res.data}
        
        pending_sync = [doc for doc in docs_res.data if doc["id"] not in synced_docs and doc.get("status") == "completed"]
        
        if pending_sync:
            logger.warning(f"⚠ {len(pending_sync)} completed documents are not synced to Notion yet:")
            for doc in pending_sync[:10]:
                logger.info(f"   - {doc['name']}")
        else:
            logger.info("   ✓ All completed documents are synced!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to check documents: {str(e)}")
        return False

def check_sync_issues():
    """Check for specific sync issues"""
    logger.info("\n" + "=" * 60)
    logger.info("4. CHECKING FOR SYNC ISSUES")
    logger.info("=" * 60)
    
    try:
        # Check for failed syncs
        failed_res = supabase_client.table("crm_logs").select("*").eq("status", "failed").execute()
        
        if failed_res.data:
            logger.error(f"❌ Found {len(failed_res.data)} failed sync attempts:")
            for log in failed_res.data[:5]:
                doc_res = supabase_client.table("documents").select("name").eq("id", log["document_id"]).execute()
                doc_name = doc_res.data[0]["name"] if doc_res.data else "Unknown"
                
                logger.error(f"\n   Document: {doc_name}")
                logger.error(f"   Error: {log.get('error_message', 'Unknown error')[:200]}")
                logger.error(f"   Last Attempt: {log.get('last_attempt', 'N/A')}")
            
            return False
        else:
            logger.info("✓ No failed sync attempts found")
            return True
        
    except Exception as e:
        logger.error(f"❌ Failed to check sync issues: {str(e)}")
        return False

def main():
    """Run all diagnostic checks"""
    logger.info("\n🔍 NOTION SYNC DIAGNOSTIC REPORT")
    logger.info(f"Generated: {datetime.utcnow().isoformat()}\n")
    
    checks = [
        ("Notion Token Configuration", check_notion_token()),
        ("CRM Logs Table", check_crm_logs_table()),
        ("Document Processing Status", check_documents_status()),
        ("Sync Issues", check_sync_issues()),
    ]
    
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    
    all_passed = all(result for _, result in checks)
    
    for check_name, passed in checks:
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info(f"{status}: {check_name}")
    
    logger.info("\n" + "=" * 60)
    if all_passed:
        logger.info("✓ All checks passed! Notion sync appears to be working correctly.")
    else:
        logger.error("✗ Some checks failed. See details above for more information.")
        logger.info("\nCommon solutions:")
        logger.info("1. Check if NOTION_TOKEN is correctly set in .env")
        logger.info("2. Verify Notion database is shared with the integration")
        logger.info("3. Check backend logs for API errors")
        logger.info("4. Ensure documents are in 'completed' status before syncing")
    logger.info("=" * 60 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
