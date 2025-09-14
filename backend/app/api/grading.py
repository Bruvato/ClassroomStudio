"""
Grading API endpoints

Handles PDF processing and AI-powered grading requests from Convex.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from ..services.pdf_processor import PDFProcessor
from ..services.grading_agent import GradingAgent, GradingCriteria
from ..config import get_settings

logger = logging.getLogger(__name__)

# Pydantic models for API requests/responses
class GradingRequest(BaseModel):
    """Request to grade a submission."""
    submission_id: str = Field(description="Convex submission ID")
    student_pdf_url: str = Field(description="URL to student's PDF submission")
    solution_pdf_url: str = Field(description="URL to teacher's solution PDF")
    assignment_context: Dict[str, Any] = Field(description="Assignment details")
    grading_criteria: Optional[List[Dict[str, Any]]] = Field(default=None, description="Custom grading criteria")
    max_pages: Optional[int] = Field(default=None, description="Maximum pages to process")
    webhook_url: Optional[str] = Field(default=None, description="Convex webhook URL for results")


class ProcessingStatus(BaseModel):
    """Status of processing request."""
    submission_id: str
    status: str  # "processing", "completed", "failed"
    progress: float  # 0-1
    message: str
    started_at: datetime
    completed_at: Optional[datetime] = None


class GradingResponse(BaseModel):
    """Response from grading request."""
    submission_id: str
    status: str
    message: str
    processing_id: Optional[str] = None
    estimated_completion: Optional[datetime] = None


class GradingResultResponse(BaseModel):
    """Complete grading results."""
    submission_id: str
    overall_score: float
    confidence: float
    weaknesses: List[Dict[str, Any]]
    strengths: List[Dict[str, Any]]
    summary: str
    detailed_feedback: str
    criteria_scores: Dict[str, float]
    processing_time_ms: float
    model_used: str
    analyzed_at: datetime


# Router setup
router = APIRouter(prefix="/grading", tags=["grading"])

# Global services - initialized on startup
pdf_processor: Optional[PDFProcessor] = None
grading_agent: Optional[GradingAgent] = None
processing_status: Dict[str, ProcessingStatus] = {}


def get_pdf_processor() -> PDFProcessor:
    """Get PDF processor instance."""
    global pdf_processor
    if pdf_processor is None:
        pdf_processor = PDFProcessor()
    return pdf_processor


def get_grading_agent() -> GradingAgent:
    """Get grading agent instance."""
    global grading_agent
    if grading_agent is None:
        settings = get_settings()
        grading_agent = GradingAgent(api_key=settings.google_ai_api_key)
    return grading_agent


@router.post("/grade-submission", response_model=GradingResponse)
async def grade_submission(
    request: GradingRequest,
    background_tasks: BackgroundTasks
):
    """
    Start grading a submission.
    
    This endpoint:
    1. Validates the request
    2. Starts background processing
    3. Returns immediately with processing status
    4. Will callback to webhook_url when complete (if provided)
    """
    try:
        logger.info(f"Starting grading request for submission {request.submission_id}")
        
        # Validate URLs
        if not request.student_pdf_url or not request.solution_pdf_url:
            raise HTTPException(status_code=400, detail="Both student and solution PDF URLs are required")
        
        # Create processing status
        processing_id = f"grade_{request.submission_id}_{int(datetime.now().timestamp())}"
        status = ProcessingStatus(
            submission_id=request.submission_id,
            status="processing",
            progress=0.0,
            message="Starting PDF processing...",
            started_at=datetime.now()
        )
        processing_status[processing_id] = status
        
        # Start background processing
        background_tasks.add_task(
            process_grading_request,
            processing_id,
            request
        )
        
        return GradingResponse(
            submission_id=request.submission_id,
            status="accepted",
            message="Grading started",
            processing_id=processing_id,
            estimated_completion=None  # Could add estimation logic
        )
        
    except Exception as e:
        logger.error(f"Error starting grading for submission {request.submission_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start grading: {str(e)}")


@router.get("/status/{processing_id}", response_model=ProcessingStatus)
async def get_processing_status(processing_id: str):
    """Get the status of a processing request."""
    if processing_id not in processing_status:
        raise HTTPException(status_code=404, detail="Processing ID not found")
    
    return processing_status[processing_id]


@router.post("/test-pdf-processing")
async def test_pdf_processing(pdf_url: str, max_pages: Optional[int] = 2):
    """Test PDF processing without grading (for debugging)."""
    try:
        processor = get_pdf_processor()
        images = await processor.process_pdf_from_url(pdf_url, max_pages)
        
        return {
            "status": "success",
            "message": f"Processed {len(images)} pages",
            "pages": len(images),
            "images": [
                {
                    "page": img["page_number"],
                    "width": img["width"],
                    "height": img["height"],
                    "format": img["format"],
                    "size_kb": len(img["image_base64"]) * 3 / 4 / 1024  # Approximate size
                }
                for img in images
            ]
        }
        
    except Exception as e:
        logger.error(f"Test PDF processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_grading_request(processing_id: str, request: GradingRequest):
    """
    Background task to process grading request.
    
    This function:
    1. Downloads and processes both PDFs to images
    2. Calls the AI grading agent
    3. Updates processing status
    4. Calls webhook if provided
    """
    status = processing_status[processing_id]
    
    try:
        # Step 1: Process student PDF
        status.message = "Processing student submission PDF..."
        status.progress = 0.1
        
        processor = get_pdf_processor()
        student_images = await processor.process_pdf_from_url(
            request.student_pdf_url,
            request.max_pages
        )
        
        logger.info(f"Processed student PDF: {len(student_images)} pages")
        
        # Step 2: Process solution PDF  
        status.message = "Processing solution PDF..."
        status.progress = 0.3
        
        solution_images = await processor.process_pdf_from_url(
            request.solution_pdf_url,
            request.max_pages
        )
        
        logger.info(f"Processed solution PDF: {len(solution_images)} pages")
        
        # Step 3: AI Grading
        status.message = "Analyzing submission with AI..."
        status.progress = 0.5
        
        agent = get_grading_agent()
        
        # Convert criteria if provided
        grading_criteria = None
        if request.grading_criteria:
            grading_criteria = [
                GradingCriteria(**criteria) for criteria in request.grading_criteria
            ]
        
        start_time = datetime.now()
        result = await agent.grade_submission(
            student_images=student_images,
            solution_images=solution_images,
            assignment_context=request.assignment_context,
            grading_criteria=grading_criteria
        )
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Step 4: Format results
        status.message = "Finalizing results..."
        status.progress = 0.9
        
        grading_result = GradingResultResponse(
            submission_id=request.submission_id,
            overall_score=result.overall_score,
            confidence=result.confidence,
            weaknesses=[weakness.dict() for weakness in result.weaknesses],
            strengths=[strength.dict() for strength in result.strengths],
            summary=result.summary,
            detailed_feedback=result.detailed_feedback,
            criteria_scores=result.criteria_scores,
            processing_time_ms=processing_time,
            model_used="gemini-1.5-flash",
            analyzed_at=datetime.now()
        )
        
        # Step 5: Complete processing
        status.status = "completed"
        status.progress = 1.0
        status.message = "Grading completed successfully"
        status.completed_at = datetime.now()
        
        logger.info(f"Grading completed for {request.submission_id}: {result.overall_score}/100")
        
        # Step 6: Send webhook if provided
        if request.webhook_url:
            await send_webhook(request.webhook_url, grading_result)
        
        # Store result for retrieval
        processing_status[f"{processing_id}_result"] = grading_result
        
    except Exception as e:
        logger.error(f"Error processing grading request {processing_id}: {e}")
        
        status.status = "failed"
        status.message = f"Processing failed: {str(e)}"
        status.completed_at = datetime.now()
        
        # Send error webhook if provided
        if request.webhook_url:
            error_result = {
                "submission_id": request.submission_id,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            try:
                await send_webhook(request.webhook_url, error_result)
            except Exception as webhook_error:
                logger.error(f"Failed to send error webhook: {webhook_error}")


async def send_webhook(webhook_url: str, data: Any):
    """Send results to Convex webhook."""
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=data.dict() if hasattr(data, 'dict') else data,
                timeout=30.0
            )
            response.raise_for_status()
            logger.info(f"Webhook sent successfully to {webhook_url}")
            
    except Exception as e:
        logger.error(f"Failed to send webhook to {webhook_url}: {e}")
        raise


@router.get("/result/{processing_id}", response_model=GradingResultResponse)
async def get_grading_result(processing_id: str):
    """Get the final grading result."""
    result_key = f"{processing_id}_result"
    
    if result_key not in processing_status:
        # Check if processing is still ongoing
        if processing_id in processing_status:
            status = processing_status[processing_id]
            if status.status == "processing":
                raise HTTPException(status_code=202, detail="Processing still in progress")
            elif status.status == "failed":
                raise HTTPException(status_code=500, detail=status.message)
        
        raise HTTPException(status_code=404, detail="Results not found")
    
    return processing_status[result_key]


@router.post("/test-gemini-api")
async def test_gemini_api():
    """
    Simple test to verify Gemini API is working without images.
    """
    try:
        logger.info("Testing Gemini API connection")
        
        agent = get_grading_agent()
        
        # Simple text-only test
        from langchain_core.messages import HumanMessage
        
        test_message = HumanMessage(content=[{
            "type": "text", 
            "text": "Respond with exactly this JSON: {\"test\": \"success\", \"message\": \"API working\"}"
        }])
        
        start_time = datetime.now()
        response = await agent.llm.ainvoke([test_message])
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "status": "success",
            "api_test": "passed",
            "response": response.content,
            "processing_time_ms": processing_time,
            "model": "gemini-1.5-flash"
        }
        
    except Exception as e:
        logger.error(f"Gemini API test failed: {e}")
        raise HTTPException(status_code=500, detail=f"API test failed: {str(e)}")


@router.post("/test-local-files")
async def test_local_files(max_pages: Optional[int] = 2):
    """
    Quick test endpoint that grades the local PDF files in the backend directory.
    
    Uses:
    - backend/student_submission.pdf as student submission
    - backend/teacher_solution.pdf as teacher solution
    
    Returns grading results directly without webhooks.
    """
    import os
    from pathlib import Path
    
    try:
        logger.info("Starting local files test grading")
        
        # Get paths to local PDF files
        backend_dir = Path(__file__).parent.parent.parent  # Go up to backend/ directory
        student_pdf = backend_dir / "student_submission.pdf"
        solution_pdf = backend_dir / "teacher_solution.pdf"
        
        # Check if files exist
        if not student_pdf.exists():
            raise HTTPException(status_code=404, detail=f"Student PDF not found at {student_pdf}")
        if not solution_pdf.exists():
            raise HTTPException(status_code=404, detail=f"Solution PDF not found at {solution_pdf}")
        
        logger.info(f"Processing local files: student={student_pdf}, solution={solution_pdf}")
        
        # Process student PDF
        processor = get_pdf_processor()
        student_images = processor.pdf_to_images(str(student_pdf), max_pages)
        logger.info(f"Processed student PDF: {len(student_images)} pages")
        
        # Process solution PDF
        solution_images = processor.pdf_to_images(str(solution_pdf), max_pages)
        logger.info(f"Processed solution PDF: {len(solution_images)} pages")
        
        # Grade with AI
        agent = get_grading_agent()
        
        # Mock assignment context for testing
        assignment_context = {
            "title": "Local Test Assignment",
            "description": "Testing grading with local PDF files",
            "total_points": 100,
            "subject": "Test Subject"
        }
        
        start_time = datetime.now()
        result = await agent.grade_submission(
            student_images=student_images,
            solution_images=solution_images,
            assignment_context=assignment_context,
            grading_criteria=None
        )
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Return results directly
        return {
            "status": "success",
            "submission_id": "local_test",
            "overall_score": result.overall_score,
            "confidence": result.confidence,
            "weaknesses": [weakness.dict() for weakness in result.weaknesses],
            "strengths": [strength.dict() for strength in result.strengths],
            "summary": result.summary,
            "detailed_feedback": result.detailed_feedback,
            "criteria_scores": result.criteria_scores,
            "processing_time_ms": processing_time,
            "model_used": "gemini-1.5-flash",
            "analyzed_at": datetime.now().isoformat(),
            "files_processed": {
                "student_pdf": str(student_pdf),
                "solution_pdf": str(solution_pdf),
                "student_pages": len(student_images),
                "solution_pages": len(solution_images)
            }
        }
        
    except Exception as e:
        logger.error(f"Error in local files test: {e}")
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


# Health check
@router.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Test services
        processor = get_pdf_processor()
        agent = get_grading_agent()
        
        return {
            "status": "healthy",
            "services": {
                "pdf_processor": "ready",
                "grading_agent": "ready"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
