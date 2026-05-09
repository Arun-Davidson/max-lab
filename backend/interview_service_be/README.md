# HIRION AI Interview Service

This is the Python-based microservice for the **HIRION Online AI Interview Portal**. It manages the orchestration of AI interviews, integration with n8n workflows, and handles technical analysis of candidate recordings.

## Features

- **AI Question Generation**: Automatically generates role-specific interview questions using OpenAI/Gemini.
- **Workflow Orchestration**: Triggers n8n workflows to manage video conferencing (Zoom/Twilio), transcription, and analysis.
- **Automated Scoring**: Receives and processes AI-generated scores for technical skills, communication, and culture fit.
- **Key Moment Extraction**: Identifies and timestamps critical parts of the interview for recruiter review.

## Tech Stack

- **FastAPI**: Modern, high-performance web framework for Python.
- **Pydantic**: Data validation and settings management.
- **HTTPX**: Asynchronous HTTP client for n8n and Core BE communication.
- **SQLAlchemy**: (Optional) For local persistence if needed.

## Quick Start

### 1. Prerequisites
- Python 3.9+
- An n8n instance
- API keys for OpenAI, Zoom (optional), and AssemblyAI

### 2. Setup
```bash
# Clone and navigate
cd interview_service_be

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook/interview-start
CORE_BACKEND_URL=http://localhost:5000
OPENAI_API_KEY=sk-...
```

### 4. Run the Service
```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/interviews/` | Create a new interview session |
| `GET` | `/api/v1/interviews/{id}` | Get interview status and results |
| `POST` | `/api/v1/interviews/{id}/callback` | Webhook for n8n to post results |
| `GET` | `/health` | Health check |

## License
MIT
