"""
AI Grading Agent

Uses LangChain with Google Gemini Pro Vision to analyze student submissions
and compare them against teacher solution keys.
"""

import os
import json
import asyncio
import re
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class GradingCriteria(BaseModel):
    """Structure for grading criteria."""
    name: str = Field(description="Name of the grading criterion")
    description: str = Field(description="Description of what to evaluate")
    max_points: float = Field(description="Maximum points for this criterion")


class Weakness(BaseModel):
    """Structure for identified weaknesses."""
    category: str = Field(description="Category of weakness (conceptual, syntax, logic, etc.)")
    description: str = Field(description="Detailed description of the weakness")
    severity: str = Field(description="Severity level: minor, moderate, major, critical")
    location: Optional[str] = Field(description="Where in the document this occurs")
    suggestion: str = Field(description="Specific suggestion for improvement")


class Strength(BaseModel):
    """Structure for identified strengths."""
    category: str = Field(description="Category of strength")
    description: str = Field(description="What the student did well")


class GradingResult(BaseModel):
    """Complete grading result structure."""
    overall_score: float = Field(description="Overall score out of 100")
    confidence: float = Field(description="AI confidence level (0-1)")
    weaknesses: List[Weakness] = Field(description="Identified weaknesses")
    strengths: List[Strength] = Field(description="Identified strengths")
    summary: str = Field(description="Brief summary of performance")
    detailed_feedback: str = Field(description="Detailed feedback for the student")
    criteria_scores: Dict[str, float] = Field(description="Scores for each grading criterion")


class GradingAgent:
    """AI-powered grading agent using Gemini Pro Vision."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the grading agent."""
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
        if not self.api_key:
            raise ValueError("Google AI API key is required")
        
        # Initialize Gemini Pro Vision model
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=self.api_key,
            temperature=0.1,  # Low temperature for consistent grading
            max_tokens=4000,
            timeout=120  # 2 minute timeout
        )
        
        # Set up output parser
        self.parser = JsonOutputParser(pydantic_object=GradingResult)
        
        self.logger = logging.getLogger(__name__)
    
    async def grade_submission(
        self,
        student_images: List[dict],
        solution_images: List[dict],
        assignment_context: Dict[str, Any],
        grading_criteria: Optional[List[GradingCriteria]] = None
    ) -> GradingResult:
        """
        Grade a student submission against a solution key.
        
        Args:
            student_images: List of student submission images (base64 encoded)
            solution_images: List of solution key images (base64 encoded)
            assignment_context: Context about the assignment (title, description, etc.)
            grading_criteria: Specific grading criteria to evaluate
            
        Returns:
            Structured grading result
        """
        try:
            self.logger.info(f"Starting grading for assignment: {assignment_context.get('title', 'Unknown')}")
            
            # Build the grading prompt
            prompt = self._build_grading_prompt(assignment_context, grading_criteria)
            
            # Validate images before processing
            if not self.validate_images(solution_images):
                raise Exception("Solution images validation failed")
            if not self.validate_images(student_images):
                raise Exception("Student images validation failed")
            
            # Log image info for debugging
            total_solution_size = sum(len(img['image_base64']) for img in solution_images)
            total_student_size = sum(len(img['image_base64']) for img in student_images)
            self.logger.info(f"Image sizes - Solution: {total_solution_size/1024:.1f}KB ({len(solution_images)} images), Student: {total_student_size/1024:.1f}KB ({len(student_images)} images)")
            
            # Prepare images for the model
            message_content = [{"type": "text", "text": prompt}]
            
            # Add solution images first (limit to first 2 pages for now)
            for i, img_data in enumerate(solution_images[:2]):
                self.logger.debug(f"Adding solution image {i+1}: {img_data['width']}x{img_data['height']}")
                message_content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_data['image_base64']}"
                    }
                })
            
            # Add student images (limit to first 2 pages for now)  
            for i, img_data in enumerate(student_images[:2]):
                self.logger.debug(f"Adding student image {i+1}: {img_data['width']}x{img_data['height']}")
                message_content.append({
                    "type": "image_url", 
                    "image_url": {
                        "url": f"data:image/png;base64,{img_data['image_base64']}"
                    }
                })
            
            # Create the message
            message = HumanMessage(content=message_content)
            
            # Get response from Gemini with timeout
            start_time = datetime.now()
            try:
                self.logger.info(f"Calling Gemini API with {len(message_content)} items (1 text + {len(message_content)-1} images)")
                response = await asyncio.wait_for(
                    self.llm.ainvoke([message]),
                    timeout=120.0  # 2 minute timeout
                )
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                
                self.logger.info(f"Gemini processing completed in {processing_time:.2f}ms")
                
                # Check for empty response
                if not response or not response.content:
                    raise Exception("Gemini returned an empty response")
                    
                self.logger.debug(f"Gemini response length: {len(response.content)} characters")
                
            except asyncio.TimeoutError:
                raise Exception("Gemini API request timed out after 2 minutes")
            except Exception as e:
                self.logger.error(f"Gemini API error: {str(e)}")
                raise
            
            # Parse the response
            try:
                # Clean the response content - remove markdown code blocks if present
                content = response.content.strip()
                self.logger.debug(f"Raw Gemini response: {content[:200]}...")
                
                # Handle common markdown wrapping
                if content.startswith("```json"):
                    content = content[7:]  # Remove ```json
                if content.startswith("```"):
                    content = content[3:]   # Remove ```
                if content.endswith("```"):
                    content = content[:-3]  # Remove closing ```
                
                content = content.strip()
                
                # Try to parse as JSON
                result_dict = json.loads(content)
                result = GradingResult(**result_dict)
                
                self.logger.info(f"Grading completed - Score: {result.overall_score}/100, Confidence: {result.confidence}")
                return result
                
            except json.JSONDecodeError as e:
                self.logger.error(f"Failed to parse Gemini response as JSON: {e}")
                self.logger.error(f"Raw response content: {response.content}")
                # Fallback: create a basic result
                return self._create_fallback_result(response.content, processing_time)
                
        except Exception as e:
            self.logger.error(f"Error during grading: {str(e)}")
            raise Exception(f"Grading failed: {str(e)}")
    
    def _build_grading_prompt(
        self,
        assignment_context: Dict[str, Any],
        grading_criteria: Optional[List[GradingCriteria]] = None
    ) -> str:
        """Build the comprehensive grading prompt."""
        
        base_prompt = f"""
You are an expert academic grader analyzing a student's submission against a teacher's solution key.

ASSIGNMENT CONTEXT:
- Title: {assignment_context.get('title', 'Unknown Assignment')}
- Description: {assignment_context.get('description', 'No description provided')}
- Total Points: {assignment_context.get('total_points', 100)}
- Subject: {assignment_context.get('subject', 'General')}

INSTRUCTIONS:
1. The first set of images shows the TEACHER'S SOLUTION KEY
2. The second set of images shows the STUDENT'S SUBMISSION  
3. Compare the student's work against the solution key
4. Provide detailed, constructive feedback
5. Be fair but thorough in your evaluation

GRADING CRITERIA:
"""
        
        if grading_criteria:
            for i, criteria in enumerate(grading_criteria, 1):
                base_prompt += f"{i}. {criteria.name} ({criteria.max_points} points): {criteria.description}\n"
        else:
            base_prompt += """
1. Correctness (40 points): Accuracy of answers and solutions
2. Method/Approach (30 points): Appropriate methods and problem-solving approach  
3. Presentation (20 points): Clarity, organization, and communication
4. Completeness (10 points): All parts of the assignment addressed
"""
        
        base_prompt += f"""

OUTPUT REQUIREMENTS:
You MUST respond with ONLY a valid JSON object - no additional text, no markdown code blocks, no explanations.
The response must be a single JSON object matching this exact structure:

{{
    "overall_score": <float 0-100>,
    "confidence": <float 0.0-1.0>,
    "weaknesses": [
        {{
            "category": "<string: conceptual|syntax|logic|presentation|method|other>",
            "description": "<detailed description>",
            "severity": "<minor|moderate|major|critical>", 
            "location": "<specific location or null>",
            "suggestion": "<specific improvement suggestion>"
        }}
    ],
    "strengths": [
        {{
            "category": "<string>",
            "description": "<what student did well>"
        }}
    ],
    "summary": "<brief 2-3 sentence summary>",
    "detailed_feedback": "<comprehensive feedback for student improvement>",
    "criteria_scores": {{
        "correctness": <score>,
        "method": <score>, 
        "presentation": <score>,
        "completeness": <score>
    }}
}}

GRADING GUIDELINES:
- Be constructive and encouraging while being honest about mistakes
- Identify specific areas for improvement with actionable suggestions
- Recognize good work and effort even if there are errors
- Consider partial credit for correct reasoning with minor errors
- Focus on learning outcomes, not just final answers
- Set confidence based on image clarity and your certainty about the evaluation

Begin your analysis now:
"""
        
        return base_prompt
    
    def _create_fallback_result(self, raw_response: str, processing_time: float) -> GradingResult:
        """Create a fallback result when JSON parsing fails."""
        
        # Try to extract partial data from the raw response if it looks like JSON
        partial_data = self._extract_partial_json_data(raw_response)
        
        if partial_data:
            self.logger.info(f"Extracted partial data from failed JSON parse: score={partial_data.get('overall_score', 'N/A')}")
            return GradingResult(
                overall_score=partial_data.get('overall_score', 0.0),
                confidence=max(0.1, partial_data.get('confidence', 0.3) - 0.2),  # Lower confidence due to parsing issue
                weaknesses=partial_data.get('weaknesses', []),
                strengths=partial_data.get('strengths', []),
                summary=partial_data.get('summary', "Grading completed with parsing issues."),
                detailed_feedback=partial_data.get('detailed_feedback', "The submission was graded but there was a technical issue with result formatting."),
                criteria_scores=partial_data.get('criteria_scores', {"parsing_error": 0.0})
            )
        else:
            return GradingResult(
                overall_score=0.0,
                confidence=0.3,
                weaknesses=[
                    Weakness(
                        category="system",
                        description="Unable to process submission properly",
                        severity="major",
                        location=None,
                        suggestion="Please resubmit with clearer images"
                    )
                ],
                strengths=[],
                summary="Grading system encountered an error processing this submission.",
                detailed_feedback=f"The AI grading system was unable to properly analyze your submission. Raw response: ```json\n{raw_response[:1000]}{'...' if len(raw_response) > 1000 else ''}",
                criteria_scores={"error": 0.0}
            )
    
    def _extract_partial_json_data(self, raw_response: str) -> Optional[Dict]:
        """Try to extract partial data from a malformed JSON response."""
        try:
            # Look for JSON-like patterns in the response
            
            # Try to find overall_score
            overall_score = None
            score_match = re.search(r'"overall_score":\s*([\d.]+)', raw_response)
            if score_match:
                overall_score = float(score_match.group(1))
            
            # Try to find confidence
            confidence = None
            conf_match = re.search(r'"confidence":\s*([\d.]+)', raw_response)
            if conf_match:
                confidence = float(conf_match.group(1))
            
            # Try to extract summary
            summary = None
            summary_match = re.search(r'"summary":\s*"([^"]+)"', raw_response)
            if summary_match:
                summary = summary_match.group(1)
            
            # If we found any useful data, return it
            if overall_score is not None or confidence is not None:
                return {
                    'overall_score': overall_score or 0.0,
                    'confidence': confidence or 0.5,
                    'summary': summary or "Partial grading results extracted.",
                    'detailed_feedback': "Grading was completed but the response format had technical issues. Score and basic feedback extracted.",
                    'weaknesses': [],
                    'strengths': [],
                    'criteria_scores': {"extracted": overall_score or 0.0}
                }
            
        except Exception as e:
            self.logger.debug(f"Failed to extract partial JSON data: {e}")
        
        return None
    
    async def batch_grade_submissions(
        self,
        submissions: List[Dict[str, Any]],
        solution_images: List[dict],
        assignment_context: Dict[str, Any],
        max_concurrent: int = 3
    ) -> List[GradingResult]:
        """Grade multiple submissions concurrently."""
        
        async def grade_single(submission_data):
            try:
                return await self.grade_submission(
                    submission_data["images"],
                    solution_images,
                    assignment_context,
                    submission_data.get("criteria")
                )
            except Exception as e:
                self.logger.error(f"Error grading submission {submission_data.get('id')}: {e}")
                return self._create_fallback_result(str(e), 0)
        
        # Limit concurrent requests to avoid rate limiting
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def grade_with_semaphore(submission_data):
            async with semaphore:
                return await grade_single(submission_data)
        
        # Process all submissions
        tasks = [grade_with_semaphore(sub) for sub in submissions]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(f"Exception grading submission {i}: {result}")
                processed_results.append(self._create_fallback_result(str(result), 0))
            else:
                processed_results.append(result)
        
        return processed_results
    
    def validate_images(self, images: List[dict]) -> bool:
        """Validate that images are suitable for processing."""
        if not images:
            self.logger.warning("No images provided for validation")
            return False
        
        for i, img in enumerate(images):
            if not img.get("image_base64"):
                self.logger.error(f"Image {i+1} missing base64 data")
                return False
            
            # Check image size - Gemini has a 4MB limit per image
            image_size_bytes = len(img["image_base64"]) * 3 // 4  # Approximate base64 to bytes
            if image_size_bytes > 4 * 1024 * 1024:  # 4MB limit
                self.logger.error(f"Image {i+1} too large: {image_size_bytes/1024/1024:.2f}MB (max 4MB)")
                return False
            
            # Check dimensions 
            width = img.get("width", 0)
            height = img.get("height", 0)
            if width > 3000 or height > 3000:
                self.logger.error(f"Image {i+1} dimensions too large: {width}x{height} (max 3000x3000)")
                return False
                
            self.logger.debug(f"Image {i+1} validated: {width}x{height}, {image_size_bytes/1024:.1f}KB")
        
        return True
