import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ── Supabase ───────────────────────────────────────────────
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://ffeijsftoahspvhdhmll.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # ── Third-party integrations ───────────────────────────────
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    NOTION_TOKEN: str = os.getenv("NOTION_TOKEN", "")
    NOTION_DATABASE_ID: str = os.getenv("NOTION_DATABASE_ID", "")
    NOTION_PAGE_ID: str = os.getenv("NOTION_PAGE_ID", "")

    # ── CORS ───────────────────────────────────────────────────
    # Comma-separated list of allowed frontend origins.
    # Example: https://my-app.pages.dev,https://www.my-domain.com
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "*")

    @property
    def allowed_origins(self) -> list[str]:
        if self.FRONTEND_URL == "*":
            return ["*"]
        return [u.strip() for u in self.FRONTEND_URL.split(",") if u.strip()]

    # Compatibility with scratch scripts
    @property
    def SUPABASE_PUBLISHABLE_KEY(self) -> str:
        return self.SUPABASE_KEY

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

