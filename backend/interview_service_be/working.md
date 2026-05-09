# How the AI Interview Portal Works

This document explains the end-to-end data flow and technical logic of the AI Interview Portal.

## The "AI" Interview Process

Yes, the interview is conducted by AI. Here is the step-by-step breakdown:

### 1. Initiation
- When a candidate applies or a recruiter triggers an interview from the **Node.js Core BE**, a request is sent to the **Python Interview Service**.
- The Python service creates a unique `interview_id` and registers the session.

### 2. Orchestration (n8n)
- The Python service calls an **n8n Workflow**.
- **Question Generation**: n8n uses AI (OpenAI GPT-4o) to look at the `job_role` and generate 5-10 specific interview questions.
- **Meeting Setup**: n8n creates a recording session (via Zoom, Twilio, or a custom frontend video component).

### 3. The Interview session
- The candidate logs into the portal.
- They are presented with the AI-generated questions one by one.
- They record their responses via webcam. This is the "Interview" phase itself.

### 4. Post-Interview Analysis (The AI Recruiter)
- Once the recording ends, n8n triggers the analysis phase:
    - **Transcription**: The video audio is converted to text via AssemblyAI/Whisper.
    - **Scoring**: The AI compares the transcript against the job requirements and scores the candidate on:
        - Technical Accuracy
        - Communication Clarity
        - Problem Solving Approach
        - Tone/Sentiment
    - **Key Moments**: AI extracts timestamps where the candidate said something particularly impressive or where they struggled.

### 5. Data Sync
- n8n sends the final JSON result back to the **Python Interview Service** callback.
- The Python service updates the **Node.js Core BE** database.
- The recruiter sees the final dashboard with circular progress bars, key moments, and the recording link.

## Data Schema Reference

The results are stored in the following format:

```json
{
  "scores": {
    "overall": 85,
    "breakdown": [
      {"category": "Technical", "score": 90},
      {"category": "Communication", "score": 80}
    ]
  },
  "key_moments": [
    {
      "timestamp": "02:15",
      "title": "Strong System Design Knowledge",
      "sentiment": "positive"
    }
  ],
  "video_url": "https://s3.amazonaws.com/path-to-video.mp4"
}
```

## Integration Points

- **Core BE -> Python BE**: REST API call to start.
- **Python BE -> n8n**: Webhook trigger.
- **n8n -> Python BE**: Webhook callback with results.
- **Python BE -> Core BE**: Polling or Database sync.
