# Notion Sync Status Diagnostics - Summary

I've created multiple tools to help you check whether data is syncing with Notion. Here's what you can use:

## 🔍 Available Diagnostic Tools

### 1. **API Endpoint** (Recommended)
The easiest way to check sync status in real-time.

**Endpoint:**
```
GET http://localhost:8000/api/sync-status
```

**What it checks:**
- ✓ Notion token configuration
- ✓ Sync statistics (synced, failed, pending counts)
- ✓ Documents pending sync
- ✓ Failed sync details with error messages
- ✓ Overall health status

**Example Response:**
```json
{
  "notion_configured": true,
  "statistics": {
    "synced": 5,
    "failed": 1,
    "pending": 0,
    "total": 6
  },
  "pending_sync_count": 2,
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

### 2. **Python Diagnostic Script**
Run comprehensive diagnostic checks from the command line.

**Location:** `backend/diagnostic_notion_sync.py`

**Usage:**
```bash
cd backend
python -m diagnostic_notion_sync
```

**Checks performed:**
1. ✓ Notion token configuration
2. ✓ CRM logs table status
3. ✓ Document processing status
4. ✓ Sync issues and error details

**Sample Output:**
```
🔍 NOTION SYNC DIAGNOSTIC REPORT
Generated: 2024-06-28T10:30:00

1. CHECKING NOTION TOKEN CONFIGURATION
✓ NOTION_TOKEN is configured
   Token preview: secret_abc123...

2. CHECKING CRM LOGS TABLE
✓ Found 6 CRM log entries:
   ✓ Synced:  5
   ✗ Failed:  1
   ⏱ Pending: 0

Recent Sync Attempts (Last 5):
   1. [✓] vendor_contract.pdf
      Status: synced
      Last Attempt: 2024-06-28T10:25:00

   2. [✗] financial_statement.xlsx
      Status: failed
      Last Attempt: 2024-06-28T10:20:00
      Error: Notion API error (401): Unauthorized
```

### 3. **Frontend Sync Status Panel** (New)
Visual sync status widget for your dashboard.

**Location:** `src/components/common/sync-status-panel.tsx`

**Features:**
- Real-time sync statistics
- Configuration status indicator
- Success rate percentage
- Failed sync details with timestamps
- Auto-refresh every 30 seconds
- Manual refresh button

**Usage in a page:**
```tsx
import { SyncStatusPanel } from "@/components/common/sync-status-panel";

export function MyPage() {
  return (
    <div>
      <SyncStatusPanel />
    </div>
  );
}
```

### 4. **Direct Database Query**
Query Supabase directly to inspect sync status.

**Check all sync attempts:**
```sql
SELECT 
  document_id,
  (SELECT name FROM documents WHERE id = crm_logs.document_id) as doc_name,
  status,
  error_message,
  last_attempt,
  retry_count
FROM crm_logs
ORDER BY last_attempt DESC;
```

**Find failed syncs:**
```sql
SELECT *
FROM crm_logs
WHERE status = 'failed'
ORDER BY last_attempt DESC;
```

**Count by status:**
```sql
SELECT status, COUNT(*) as count
FROM crm_logs
GROUP BY status;
```

### 5. **Backend Logs**
Monitor real-time sync activity in backend logs.

**What to look for:**
```
INFO: Found existing Notion database: db_id_...
INFO: Synced document {id} to Notion successfully!
ERROR: Notion API error (401): Unauthorized
ERROR: Failed to create Notion database: ...
```

## 📊 What to Check

### Is Notion Configured?
```bash
# Check if token is set
curl http://localhost:8000/api/sync-status | jq .notion_configured
```

### How Many Documents Are Synced?
```bash
# Get sync statistics
curl http://localhost:8000/api/sync-status | jq .statistics
```

### What Failed?
```bash
# Get failed sync details
curl http://localhost:8000/api/sync-status | jq .failed_syncs
```

### Are New Documents Syncing?
```bash
# Check pending sync count
curl http://localhost:8000/api/sync-status | jq .pending_sync_count
```

## 🐛 Troubleshooting Flow

1. **Start with the API endpoint:**
   ```bash
   curl http://localhost:8000/api/sync-status
   ```

2. **Check notion_configured:**
   - If `false` → Set `NOTION_TOKEN` in `.env`
   - If `true` → Continue to step 3

3. **Check failed_syncs:**
   - If errors present → See NOTION_SYNC_TROUBLESHOOTING.md
   - If empty → Sync is working

4. **Check sync statistics:**
   - If synced > 0 → Notion connection is working
   - If synced = 0 and total > 0 → Check failed_syncs for errors

5. **Check pending_sync_count:**
   - If > 0 → Documents are waiting for manual sync trigger
   - If = 0 → All completed documents have been synced

## 🔧 Manual Sync Testing

If sync isn't working automatically:

```bash
# 1. Find a document ID
curl http://localhost:8000/api/documents | jq '.[0].id'

# 2. Manually trigger sync
curl -X POST http://localhost:8000/api/documents/{document_id}/sync

# 3. Check status immediately after
curl http://localhost:8000/api/sync-status
```

## 📝 Environment Setup

Required for Notion sync to work:

```bash
# .env file
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
```

## 🚀 Next Steps

- **Monitor periodically:** Use the API endpoint in a cron job or monitoring tool
- **Add alerts:** Set up notifications when sync fails
- **Enable auto-sync:** Modify pipeline to auto-trigger sync on document completion
- **Check Notion dashboard:** Verify records appear in your Notion database

## Common Status Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `notion_configured: true` & `synced > 0` | ✓ Working perfectly | Monitor for issues |
| `notion_configured: true` & `failed > 0` | ⚠ Some issues | Check failed_syncs details |
| `notion_configured: false` | ✗ Not configured | Set NOTION_TOKEN in .env |
| `pending_sync_count > 0` | ⏱ Waiting | Manually trigger or enable auto-sync |

---

**Need more help?** See [NOTION_SYNC_TROUBLESHOOTING.md](./NOTION_SYNC_TROUBLESHOOTING.md) for detailed solutions.
