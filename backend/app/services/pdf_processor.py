"""
PDF Processing Service

Converts PDF files to images for AI processing using PyMuPDF and Pillow.
Optimizes images for Gemini Vision API requirements.
"""

import io
import base64
from typing import List, Optional, Tuple
from pathlib import Path
import fitz  # PyMuPDF
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class PDFProcessor:
    """Handles PDF to image conversion and optimization for AI processing."""
    
    # Gemini Vision API optimal image settings
    MAX_IMAGE_SIZE = 4 * 1024 * 1024  # 4MB max
    TARGET_DPI = 150  # Good balance of quality vs size
    MAX_DIMENSION = 2048  # Max width/height in pixels
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def pdf_to_images(self, pdf_path: str, max_pages: Optional[int] = None) -> List[dict]:
        """
        Convert PDF to optimized images.
        
        Args:
            pdf_path: Path to PDF file or URL
            max_pages: Maximum number of pages to process (None for all)
            
        Returns:
            List of dicts with image data and metadata
        """
        try:
            # Open PDF document
            doc = fitz.open(pdf_path)
            images = []
            
            total_pages = len(doc)
            pages_to_process = min(total_pages, max_pages) if max_pages else total_pages
            
            self.logger.info(f"Processing {pages_to_process} pages from PDF: {pdf_path}")
            
            for page_num in range(pages_to_process):
                page = doc.load_page(page_num)
                
                # Convert to image with appropriate DPI
                mat = fitz.Matrix(self.TARGET_DPI / 72, self.TARGET_DPI / 72)
                pix = page.get_pixmap(matrix=mat)
                
                # Convert to PIL Image
                img_data = pix.tobytes("png")
                pil_image = Image.open(io.BytesIO(img_data))
                
                # Optimize image
                optimized_image = self._optimize_image(pil_image)
                
                # Convert to base64 for API transmission
                base64_image = self._image_to_base64(optimized_image)
                
                images.append({
                    "page_number": page_num + 1,
                    "image_base64": base64_image,
                    "width": optimized_image.width,
                    "height": optimized_image.height,
                    "format": "PNG"
                })
                
                self.logger.debug(f"Processed page {page_num + 1}: {optimized_image.width}x{optimized_image.height}")
            
            doc.close()
            return images
            
        except Exception as e:
            self.logger.error(f"Error processing PDF {pdf_path}: {str(e)}")
            raise Exception(f"PDF processing failed: {str(e)}")
    
    def _optimize_image(self, image: Image.Image) -> Image.Image:
        """Optimize image for Gemini Vision API."""
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too large
        width, height = image.size
        if width > self.MAX_DIMENSION or height > self.MAX_DIMENSION:
            # Maintain aspect ratio
            ratio = min(self.MAX_DIMENSION / width, self.MAX_DIMENSION / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            self.logger.debug(f"Resized image from {width}x{height} to {new_width}x{new_height}")
        
        # Optimize quality to stay under size limit
        quality = 95
        while quality > 60:
            buffer = io.BytesIO()
            image.save(buffer, format='PNG', optimize=True)
            size = buffer.tell()
            
            if size <= self.MAX_IMAGE_SIZE:
                break
                
            quality -= 5
            # If still too large, try JPEG with lower quality
            if quality <= 60:
                image.save(buffer, format='JPEG', quality=quality, optimize=True)
                break
        
        buffer.seek(0)
        return Image.open(buffer)
    
    def _image_to_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string."""
        buffer = io.BytesIO()
        image.save(buffer, format='PNG', optimize=True)
        image_bytes = buffer.getvalue()
        return base64.b64encode(image_bytes).decode('utf-8')
    
    async def process_pdf_from_url(self, pdf_url: str, max_pages: Optional[int] = None) -> List[dict]:
        """
        Process PDF from URL (for Convex storage files).
        
        Args:
            pdf_url: URL to PDF file
            max_pages: Maximum pages to process
            
        Returns:
            List of processed images
        """
        try:
            # Download PDF temporarily or process from URL directly
            # PyMuPDF can handle URLs directly
            return self.pdf_to_images(pdf_url, max_pages)
            
        except Exception as e:
            self.logger.error(f"Error processing PDF from URL {pdf_url}: {str(e)}")
            raise Exception(f"PDF URL processing failed: {str(e)}")
    
    def get_pdf_info(self, pdf_path: str) -> dict:
        """Get basic information about PDF."""
        try:
            doc = fitz.open(pdf_path)
            info = {
                "page_count": len(doc),
                "title": doc.metadata.get("title", ""),
                "author": doc.metadata.get("author", ""),
                "subject": doc.metadata.get("subject", ""),
                "creator": doc.metadata.get("creator", ""),
                "format": "PDF"
            }
            doc.close()
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting PDF info for {pdf_path}: {str(e)}")
            return {"error": str(e)}
