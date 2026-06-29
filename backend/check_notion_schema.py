import httpx
import os
from dotenv import load_dotenv
import json

load_dotenv()
notion_token = os.getenv('NOTION_TOKEN')
database_id = 'f3f8b5d5-f9e3-4955-9034-b2f9af0d7da1'

headers = {
    'Authorization': f'Bearer {notion_token}',
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
}

print(f'Checking "Tasks" database schema...\n')

try:
    response = httpx.get(f'https://api.notion.com/v1/databases/{database_id}', headers=headers)
    
    if response.status_code == 200:
        db = response.json()
        properties = db.get('properties', {})
        
        print(f'Database Title: {db.get("title", [{}])[0].get("plain_text", "Untitled")}\n')
        print(f'Properties ({len(properties)}):')
        print('-' * 50)
        for prop_name, prop_config in properties.items():
            prop_type = prop_config.get('type', 'unknown')
            print(f'  - {prop_name}: {prop_type}')
    else:
        print(f'Error: {response.status_code}')
        print(response.text[:300])
        
except Exception as e:
    print(f'Error: {e}')
