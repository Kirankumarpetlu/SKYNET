# Notion Sync Troubleshooting Guide

## Quick Status Check

### Option 1: API Endpoint (Recommended)
Access the diagnostic endpoint in your browser or API client:
```
GET http://localhost:8000/api/sync-status
```

Response example:
```json
{
  "notion_configured": true,
  "statistics": {
    "synced": 5,
    "failed": 1,
    "pending": 0,
    "total": 6
  },
  "pending_sync_count": 0,
  "failed_syncs": [
    {
      "document_id": "abc123",
      "document_name": "Contract.pdf",
      "error": "Notion API error (401): Unauthorized",
      "last_attempt": "2024-06-28T10:30:00",
      "retry_count": 1
    }
  ],
  "health": {
    "syncing": true,
    "message": "Notion sync is operational"
  }
}
```

### Option 2: Python Diagnostic Script
Run the diagnostic script from the backend directory:
```bash
cd backend
python -m diagnostic_notion_sync
```

This will show:
- ✓ Notion token configuration status
- ✓ CRM logs table status and recent sync attempts
- ✓ Document processing status
- ✓ Sync issues and error details

## Common Issues & Solutions

### 1. **Notion Token Not Configured**
**Error:** `NOTION_TOKEN is not configured!`

**Solution:**
1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the integration token
3. Add to your `.env` file:
   ```
   NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Restart the backend server

### 2. **Database/Page Not Shared with Integration**
**Error:** `No shared databases or pages found in Notion`

**Solution:**
1. In Notion, create a database or page where you want records synced
2. Click the "..." menu → "Connections"
3. Search for your integration name and connect it
4. Verify the integration has "Edit" permissions

### 3. **401 Unauthorized Error**
**Error:** `Notion API error (401): Unauthorized`

**Possible causes:**
- Invalid or expired token
- Token format incorrect (should start with `secret_`)
- Integration permissions revoked

**Solution:**
1. Verify token in `.env` matches exactly
2. Generate a new token from Notion integrations page
3. Update `.env` and restart backend

### 4. **Documents Not Auto-Syncing**
**Issue:** Completed documents are not automatically synced to Notion

**Solution:**
The current implementation requires manual sync triggers. To manually sync a document:

```bash
# Using curl
curl -X POST http://localhost:8000/api/documents/{document_id}/sync

# Or call from the UI (if sync button is implemented)
```

### 5. **Failed Syncs with Retry**
**Error:** Multiple retry attempts visible in logs

**Solution:**
1. Check the specific error message in the sync status response
2. Fix the underlying issue (token, permissions, etc.)
3. Manually trigger sync again:
   ```bash
   curl -X POST http://localhost:8000/api/documents/{document_id}/sync
   ```

## Checking Sync Status via Database

Connect directly to Supabase and query the CRM logs:

```sql
-- View all sync attempts
SELECT 
  document_id,
  (SELECT name FROM documents WHERE id = crm_logs.document_id) as doc_name,
  status,
  error_message,
  last_attempt,
  retry_count
FROM crm_logs
ORDER BY last_attempt DESC;

-- Count by status
SELECT 
  status,
  COUNT(*) as count
FROM crm_logs
GROUP BY status;

-- Find failed syncs
SELECT 
  *
FROM crm_logs
WHERE status = 'failed'
ORDER BY last_attempt DESC;

-- View successful syncs
SELECT 
  document_id,
  (SELECT name FROM documents WHERE id = crm_logs.document_id) as doc_name,
  notion_page_id,
  last_attempt
FROM crm_logs
WHERE status = 'synced'
ORDER BY last_attempt DESC;
```

## Environment Variables Reference

Required for Notion sync:
- `NOTION_TOKEN` - Integration secret token (required)
- `NOTION_DATABASE_ID` - Optional, if you want to sync to a specific database
- `NOTION_PAGE_ID` - Optional, if you want to sync to a specific page

## Logs to Monitor

Backend logs show detailed sync activity:
```
INFO: Found existing Notion database: ...
INFO: Synced document {id} to Notion successfully!
ERROR: Notion API error (401): ...
ERROR: Failed to create Notion database: ...
```

Monitor these in your terminal or logging service to catch sync issues.

## Testing Sync Manually

```bash
# 1. Upload a document and wait for processing
curl -X POST http://localhost:8000/api/projects/{project_id}/upload \
  -F "files=@contract.pdf"

# 2. Check document status
curl http://localhost:8000/api/documents

# 3. Wait until status = "completed"

# 4. Manually trigger sync
curl -X POST http://localhost:8000/api/documents/{document_id}/sync

# 5. Verify in Notion dashboard
```

## Next Steps

- **Add auto-sync on document completion:** Modify `process_document_pipeline` to trigger sync when status changes to "completed"
- **Add sync retry mechanism:** Implement exponential backoff for failed syncs
- **Add Notion webhook support:** Listen for Notion updates and sync back to database
- **Add bulk sync:** Endpoint to sync multiple documents at once
