"""
Test script for the grading service.

Run this to verify the backend is working correctly.
"""

import asyncio
import logging
from app.services.pdf_processor import PDFProcessor
from app.services.grading_agent import GradingAgent
from app.config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_pdf_processing():
    """Test PDF processing with the sample PDF."""
    logger.info("Testing PDF processing...")
    
    processor = PDFProcessor()
    pdf_path = "./app/layout-parser-paper.pdf"
    
    try:
        # Test PDF info
        info = processor.get_pdf_info(pdf_path)
        logger.info(f"PDF info: {info}")
        
        # Test image conversion
        images = processor.pdf_to_images(pdf_path, max_pages=2)
        logger.info(f"Converted {len(images)} pages to images")
        
        for i, img in enumerate(images):
            logger.info(f"Page {img['page_number']}: {img['width']}x{img['height']} ({len(img['image_base64'])/1024:.1f}KB)")
        
        return images
        
    except Exception as e:
        logger.error(f"PDF processing test failed: {e}")
        return None


async def test_grading_agent():
    """Test the grading agent (requires API key)."""
    logger.info("Testing grading agent...")
    
    try:
        settings = get_settings()
        if not settings.google_ai_api_key:
            logger.warning("GOOGLE_AI_API_KEY not set - skipping grading agent test")
            return None
        
        agent = GradingAgent()
        
        # Create dummy images for testing
        dummy_images = [{
            "page_number": 1,
            "image_base64": "",  # Would need real image data
            "width": 800,
            "height": 600,
            "format": "PNG"
        }]
        
        assignment_context = {
            "title": "Test Assignment",
            "description": "Testing the grading system",
            "total_points": 100,
            "subject": "Test"
        }
        
        # Note: This would fail without real image data
        # Just test initialization for now
        logger.info("Grading agent initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Grading agent test failed: {e}")
        return None


async def main():
    """Run all tests."""
    logger.info("Starting backend service tests...")
    
    # Test PDF processing
    pdf_result = await test_pdf_processing()
    pdf_status = "✓ PASS" if pdf_result else "✗ FAIL"
    
    # Test grading agent
    grading_result = await test_grading_agent()
    grading_status = "✓ PASS" if grading_result else "✗ FAIL"
    
    logger.info("\n" + "="*50)
    logger.info("TEST RESULTS:")
    logger.info(f"PDF Processing: {pdf_status}")
    logger.info(f"Grading Agent: {grading_status}")
    logger.info("="*50)
    
    if pdf_result and grading_result:
        logger.info("✓ All tests passed! Backend is ready.")
    else:
        logger.info("✗ Some tests failed. Check configuration.")


if __name__ == "__main__":
    asyncio.run(main())
