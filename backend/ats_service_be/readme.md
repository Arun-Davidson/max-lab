# Resume ATS Flask Service

A standalone Flask service that analyzes resumes against job descriptions using NLP (spaCy and Sentence-Transformers) and provides resume data extraction for auto-fill functionality.

## Key Features

- **API Key Protection**: Secure all endpoints with API key authentication.
- **Resume Extraction**: Extract structured data from PDF resumes (name, skills, experience, summary).
- **PDF Parsing**: Automatically downloads and extracts text from resume links or file uploads using `pdfplumber`.
- **Skill Extraction**: Identifies technical skills from both resume and job description.
- **Semantic Similarity**: Uses `SentenceTransformer` to calculate how well the resume matches the job description vectorially.
- **Experience Analysis**: Estimates years of experience from text.
- **CORS Enabled**: Allows direct frontend access.
- **Structured Output**: Returns detailed JSON responses.

## Project Structure

- `app.py`: Flask entry point.
- `services/nlp_engine.py`: Core NLP logic.
- `services/pdf_parser.py`: Utility for PDF extraction.
- `requirements.txt`: Python dependencies.

## How to Run

<!-- ### 1. Setup
Run the setup script to create a virtual environment, install dependencies, and download the spaCy model:

```bash
cd ats_service
chmod +x setup.sh
./setup.sh
``` -->

### 1. Start the Service
You must activate the virtual environment before running the app:

```bash
cd ats_service_be
uv venv .venv --python 3.11 
source .venv/bin/activate
uv pip install -r requirements.txt
python3 app.py
```
The service will run on `http://0.0.0.0:5001`.

### 2. Generate an API Key
Before using the service, you need to generate an API key:

```bash
curl -X POST http://localhost:5001/api/v1/keys/generate \
     -H "Content-Type: application/json" \
     -d '{"name": "My Application"}'
```

**Response:**
```json
{
  "api_key": "your_generated_api_key_here"
}
```

### 3. Extract Resume Data (Auto-fill)
Extract structured data from a PDF or DOCX resume for auto-filling forms:

```bash
curl -X POST http://localhost:5001/api/v1/extract \
     -H "X-API-KEY: your_generated_api_key_here" \
     -F "resume=@/path/to/resume.docx"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "resourceName": "John Doe",
    "technicalSkills": ["javascript", "react", "node.js", "docker"],
    "totalExperience": 5,
    "professionalSummary": "Experienced software developer...",
    "currentRole": "Javascript",
    "designation": "Javascript"
  }
}
```

### 4. Analyze Resume Against Job Description
You can test the ATS analysis using `curl`:

```bash
curl -X POST http://localhost:5001/api/v1/analyze \
     -H "Content-Type: application/json" \
     -H "X-API-KEY: your_generated_api_key_here" \
     -d '{
       "role": "Node.js Developer",
       "job_description": "We are looking for a Node.js Developer with experience in Express, Docker, and AWS. Required 1-3 years experience.",
       "resume_link": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
     }'
```

### 5. Example ATS Analysis Output

```json
{
  "candidate": "Unknown Candidate",
  "role": "Node.js Developer",
  "final_score": 0.58,
  "ranking_decision": "Junior Node.js Developer (Review Needed)",
  "reason": {
    "experience_analysis": "0 year experience vs required 1–3 years",
    "matched_skills": [],
    "missing_skills": [
      "express.js",
      "aws",
      "node.js",
      "docker"
    ],
    "positive_signals": [],
    "risk_flags": [
      "Missing skills: express.js, aws, node.js",
      "Limited experience mentioned"
    ],
    "semantic_similarity": 0.45
  }
}

### 6. Extract Skills from Text
Extract technical skills from a combination of title and job description content:

```bash
curl -X POST http://localhost:5001/api/v1/extract-skills \
     -H "Content-Type: application/json" \
     -H "X-API-KEY: your_generated_api_key_here" \
     -d '{
       "title": "Senior Frontend Developer",
       "content": "Looking for someone with React, TypeScript, and Tailwind CSS experience."
     }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "technicalSkills": ["react", "typescript", "tailwind css"]
  }
}
```

```