import asyncio
from app.services.notion_sync import sync_document_to_notion
from app.core.security import supabase_client

print('Triggering manual CRM sync to Notion...\n')

# Get all completed documents
result = supabase_client.table('documents').select('id, name, status').eq('status', 'completed').execute()
documents = result.data or []

print(f'Found {len(documents)} completed documents')

# Get synced documents
synced = supabase_client.table('crm_logs').select('document_id').eq('status', 'synced').execute()
synced_ids = {log['document_id'] for log in synced.data or []}

documents_to_sync = [doc for doc in documents if doc['id'] not in synced_ids]
print(f'Documents pending sync: {len(documents_to_sync)}\n')

# Trigger sync for each
synced_count = 0
for doc in documents_to_sync:
    print(f'Syncing: {doc["name"]}...')
    try:
        asyncio.run(sync_document_to_notion(doc['id']))
        synced_count += 1
        print(f'  ✅ Synced')
    except Exception as e:
        print(f'  ❌ Error: {str(e)[:100]}')

print(f'\n✅ Sync complete! {synced_count}/{len(documents_to_sync)} synced successfully')
