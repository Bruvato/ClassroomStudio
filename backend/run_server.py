"""
Development server runner for the grading backend.
"""

import uvicorn
import os
from pathlib import Path

if __name__ == "__main__":
    # Set up environment if .env file exists
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  No .env file found. Copy .env.example to .env and add your GOOGLE_AI_API_KEY")
        
    print("🚀 Starting ClassroomStudio Grading Backend...")
    print("📖 API Documentation will be available at: http://localhost:8000/docs")
    print("🔍 Health check endpoint: http://localhost:8000/api/grading/health")
    print("")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
