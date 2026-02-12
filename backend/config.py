"""
Configuration management for Strato backend
"""
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # EODHD Configuration
    eodhd_api_key: str = os.getenv("EODHD_API_KEY", "")
    eodhd_base_url: str = "https://eodhd.com/api"

    # Alto AI Configuration
    alto_api_base_url: str = os.getenv("ALTO_API_BASE_URL", "")
    alto_api_key: str = os.getenv("ALTO_API_KEY", "")
    alto_model: str = os.getenv("ALTO_MODEL", "gpt-4.1-mini")

    # Server Configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

    # CORS Configuration
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:4782",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4782",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
