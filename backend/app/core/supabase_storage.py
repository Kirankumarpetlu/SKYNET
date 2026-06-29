from app.core.security import supabase_client

class SupabaseStorageService:
    def __init__(self, client):
        self.client = client

    def upload_file(self, bucket_name: str, path: str, file_data: bytes, mime_type: str = "application/octet-stream") -> str:
        """Uploads a file to Supabase storage and returns its path."""
        res = self.client.storage.from_(bucket_name).upload(
            path=path,
            file=file_data,
            file_options={"content-type": mime_type, "upsert": "true"}
        )
        return path

    def download_file(self, bucket_name: str, path: str) -> bytes:
        """Downloads a file from Supabase storage."""
        return self.client.storage.from_(bucket_name).download(path)

    def delete_file(self, bucket_name: str, path: str):
        """Deletes a file from Supabase storage."""
        self.client.storage.from_(bucket_name).remove(path)

storage_service = SupabaseStorageService(supabase_client)
