import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .api.grading import router as grading_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle app startup and shutdown."""
    # Startup
    settings = get_settings()
    logger.info(f"Starting {settings.app_name}")
    
    # Validate required environment variables
    if not settings.google_ai_api_key:
        logger.error("GOOGLE_AI_API_KEY environment variable is required")
        raise ValueError("Missing required environment variable: GOOGLE_AI_API_KEY")
    
    logger.info("Backend services initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down backend services")


# Create FastAPI app with lifespan
app = FastAPI(
    title="ClassroomStudio Grading Backend",
    description="AI-powered grading service for student submissions",
    version="1.0.0",
    lifespan=lifespan
)

# Get settings
settings = get_settings()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(grading_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "ClassroomStudio Grading Backend",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "grading": "/api/grading",
            "health": "/api/grading/health",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health():
    """Simple health check endpoint."""
    return {
        "status": "healthy",
        "service": "grading-backend"
    }