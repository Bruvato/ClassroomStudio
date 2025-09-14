"""
Application configuration

Handles environment variables and settings for the backend service.
"""

import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # API Keys
    google_ai_api_key: str = ""
    
    # FastAPI settings
    app_name: str = "ClassroomStudio Grading Backend"
    debug: bool = False
    
    # CORS settings
    cors_origins: list = [
        "http://localhost:3000",  # Next.js dev
        "https://*.convex.dev",   # Convex
        "https://*.vercel.app",   # Vercel deployment
    ]
    
    # Processing limits
    max_pdf_pages: int = 20
    max_concurrent_grading: int = 3
    
    # Timeouts
    pdf_processing_timeout: int = 120  # seconds
    ai_grading_timeout: int = 300  # seconds
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore",  # Ignore extra environment variables
        "case_sensitive": False
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
