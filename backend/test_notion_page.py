import httpx
import os
from dotenv import load_dotenv

load_dotenv()
notion_token = os.getenv('NOTION_TOKEN')
page_id = 'f3f8b5d5f9e349559034b2f9af0d7da1'

print(f'Testing Notion Page Connection...\n')
print(f'Page ID: {page_id}')
print(f'Token: {notion_token[:20] if notion_token else "NOT SET"}...\n')

if not notion_token:
    print('ERROR: NOTION_TOKEN not set')
    exit(1)

headers = {
    'Authorization': f'Bearer {notion_token}',
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
}

try:
    # Test 1: Get the page
    print('1. Checking if page is accessible...')
    response = httpx.get(f'https://api.notion.com/v1/pages/{page_id}', headers=headers)
    
    if response.status_code == 200:
        print('   ✅ Page is accessible!')
        page_data = response.json()
        print(f'   Object Type: {page_data.get("object")}')
        print(f'   Parent: {page_data.get("parent", {}).get("type")}')
    else:
        print(f'   ❌ Error: {response.status_code}')
        print(f'   Response: {response.text[:200]}')
    
    print('\n2. Searching for databases shared with this integration...')
    search_payload = {
        'filter': {
            'value': 'database',
            'property': 'object'
        }
    }
    response = httpx.post('https://api.notion.com/v1/search', json=search_payload, headers=headers)
    
    if response.status_code == 200:
        results = response.json().get('results', [])
        print(f'   Found {len(results)} database(s)')
        for db in results:
            db_title = db.get('title', [])
            if db_title and isinstance(db_title, list):
                title = db_title[0].get('plain_text', 'Untitled') if db_title else 'Untitled'
            else:
                title = 'Untitled'
            print(f'   ✅ {title}')
    else:
        print(f'   ❌ Error: {response.status_code}')
        
except Exception as e:
    print(f'❌ Exception: {e}')
