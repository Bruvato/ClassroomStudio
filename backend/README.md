# ClassroomStudio Grading Backend

AI-powered grading service for student submissions using Google Gemini Pro Vision.

## Features

- **PDF Processing**: Converts PDF submissions to optimized images
- **AI Grading**: Uses Google Gemini Pro Vision to analyze and grade submissions
- **Comparison**: Compares student work against teacher solution keys
- **Structured Feedback**: Provides detailed, actionable feedback to students
- **Async Processing**: Handles multiple submissions concurrently
- **Webhook Integration**: Integrates seamlessly with Convex frontend

## Setup

### 1. Install Dependencies

```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -e .
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Google AI API key:

```env
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

### 3. Get Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the key to your `.env` file

### 4. Run the Server

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Core Grading

- `POST /api/grading/grade-submission` - Start grading a submission
- `GET /api/grading/status/{processing_id}` - Check processing status
- `GET /api/grading/result/{processing_id}` - Get grading results

### Testing & Health

- `GET /api/grading/health` - Service health check
- `POST /api/grading/test-pdf-processing` - Test PDF processing

### Documentation

- `GET /docs` - Swagger API documentation
- `GET /redoc` - ReDoc API documentation

## Usage Example

### Grade a Submission

```python
import httpx

# Start grading
response = await httpx.post("http://localhost:8000/api/grading/grade-submission", json={
    "submission_id": "submission_123",
    "student_pdf_url": "https://storage.convex.dev/student.pdf",
    "solution_pdf_url": "https://storage.convex.dev/solution.pdf",
    "assignment_context": {
        "title": "Math Homework 1",
        "description": "Solve the algebra problems",
        "total_points": 100,
        "subject": "Mathematics"
    },
    "webhook_url": "https://your-convex.dev/webhook/grading-complete"
})

processing_id = response.json()["processing_id"]

# Check status
status = await httpx.get(f"http://localhost:8000/api/grading/status/{processing_id}")

# Get results (when complete)
results = await httpx.get(f"http://localhost:8000/api/grading/result/{processing_id}")
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PDF Processor │    │  Grading Agent  │    │   API Layer     │
│                 │    │                 │    │                 │
│ - PyMuPDF       │    │ - LangChain     │    │ - FastAPI       │
│ - Pillow        │    │ - Gemini Pro    │    │ - Async Tasks   │
│ - Optimization  │    │ - Structured    │    │ - Webhooks      │
│                 │    │   Output        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Configuration

Environment variables:

| Variable                 | Default | Description                      |
| ------------------------ | ------- | -------------------------------- |
| `GOOGLE_AI_API_KEY`      | -       | Google AI API key (required)     |
| `DEBUG`                  | false   | Enable debug logging             |
| `MAX_PDF_PAGES`          | 20      | Maximum pages to process per PDF |
| `MAX_CONCURRENT_GRADING` | 3       | Max concurrent AI requests       |
| `PDF_PROCESSING_TIMEOUT` | 120     | PDF processing timeout (seconds) |
| `AI_GRADING_TIMEOUT`     | 300     | AI grading timeout (seconds)     |

## Development

### Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── grading.py          # API endpoints
│   ├── services/
│   │   ├── pdf_processor.py    # PDF to image conversion
│   │   └── grading_agent.py    # AI grading logic
│   ├── config.py               # Settings management
│   └── main.py                 # FastAPI app
├── pyproject.toml              # Dependencies
└── README.md
```

### Adding New Features

1. **New grading criteria**: Extend `GradingCriteria` in `grading_agent.py`
2. **Different AI models**: Modify the model initialization in `GradingAgent`
3. **Additional file formats**: Extend `PDFProcessor` to handle other formats
4. **Custom prompts**: Update the prompt building logic in `_build_grading_prompt`

### Testing

```bash
# Test PDF processing
curl -X POST "http://localhost:8000/api/grading/test-pdf-processing?pdf_url=YOUR_PDF_URL&max_pages=2"

# Health check
curl "http://localhost:8000/api/grading/health"
```

## Deployment

### Docker (Optional)

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml .
RUN pip install -e .

COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables for Production

Make sure to set:

- `GOOGLE_AI_API_KEY`
- Proper CORS origins in `config.py`
- Appropriate timeout values
- Logging configuration

## Integration with Convex

The backend is designed to work with Convex HTTP actions:

1. Convex calls `/api/grading/grade-submission` with PDF URLs
2. Backend processes asynchronously
3. Results sent back via webhook to Convex
4. Convex updates the database with grading results

See the frontend Convex functions for integration examples.
