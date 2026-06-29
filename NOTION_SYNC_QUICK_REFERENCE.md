# Notion Sync Status - Quick Reference

## ⚡ Quick Commands

### Check Status (JSON)
```bash
curl http://localhost:8000/api/sync-status
```

### Check Status (Pretty)
```bash
curl http://localhost:8000/api/sync-status | jq '.'
```

### Sync Statistics Only
```bash
curl http://localhost:8000/api/sync-status | jq '.statistics'
```

### Check Health
```bash
curl http://localhost:8000/api/sync-status | jq '.health'
```

### List Failed Syncs
```bash
curl http://localhost:8000/api/sync-status | jq '.failed_syncs'
```

### Run Diagnostic Script
```bash
cd backend && python -m diagnostic_notion_sync
```

## 🎯 Key Indicators

### Good Signs ✓
- `notion_configured: true`
- `statistics.synced > 0`
- `health.syncing: true`
- `failed_syncs: []` (empty)

### Warning Signs ⚠
- `statistics.failed > 0` with error messages
- `pending_sync_count > 0`
- `notion_configured: false`

## 🔧 Fix Common Issues

### Missing Token
```bash
# 1. Generate token: https://www.notion.so/my-integrations
# 2. Add to .env:
NOTION_TOKEN=secret_xxxxx

# 3. Restart backend
```

### Force Sync a Document
```bash
curl -X POST http://localhost:8000/api/documents/{document_id}/sync
```

### Check Specific Document Sync Status
```sql
SELECT * FROM crm_logs WHERE document_id = 'doc_id' LIMIT 1;
```

## 📋 Monitoring

### Check Every 5 Minutes
```bash
watch -n 300 'curl -s http://localhost:8000/api/sync-status | jq ".statistics"'
```

### Get Sync Success Rate
```bash
curl -s http://localhost:8000/api/sync-status | jq '(.statistics.synced / .statistics.total * 100) | round'
```

### Find Error Pattern
```bash
curl -s http://localhost:8000/api/sync-status | jq '.failed_syncs[].error' | sort | uniq -c
```

## 📍 Resource Locations

| Tool | Location | Type |
|------|----------|------|
| API Endpoint | `/api/sync-status` | HTTP GET |
| Diagnostic Script | `backend/diagnostic_notion_sync.py` | Python |
| Frontend Panel | `src/components/common/sync-status-panel.tsx` | React |
| Troubleshooting | `NOTION_SYNC_TROUBLESHOOTING.md` | Guide |
| Full Docs | `NOTION_SYNC_DIAGNOSTICS.md` | Docs |

## 🚨 Emergency Checks

### Is Backend Running?
```bash
curl http://localhost:8000/api/projects
```

### Is Supabase Connected?
```bash
curl http://localhost:8000/api/documents
```

### Is Notion Token Valid?
```bash
# Check in response
curl http://localhost:8000/api/sync-status | jq '.notion_configured'
```

### Find Failed Document
```bash
curl http://localhost:8000/api/sync-status | jq '.failed_syncs[0]'
```

---

**TIP:** Bookmark `http://localhost:8000/api/sync-status` for quick monitoring!
