from fastapi import APIRouter, HTTPException, BackgroundTasks
from ...schemas.interview import InterviewCreate, InterviewResponse, InterviewCallback
from ...services.n8n_service import trigger_n8n_workflow
from uuid import uuid4

router = APIRouter()

# Mock database - Replace with real DB later
interviews_db = {}

@router.post("/", response_model=InterviewResponse)
async def create_interview(interview_data: InterviewCreate, background_tasks: BackgroundTasks):
    interview_id = str(uuid4())
    
    interview = {
        "id": interview_id,
        "candidate_id": interview_data.candidate_id,
        "job_role": interview_data.job_role,
        "status": "pending",
        "questions": [],
        "scores": None,
        "video_url": None,
        "key_moments": []
    }
    
    interviews_db[interview_id] = interview
    
    # Trigger n8n workflow in background
    background_tasks.add_task(
        trigger_n8n_workflow, 
        interview_id=interview_id, 
        candidate_id=interview_data.candidate_id,
        job_role=interview_data.job_role
    )
    
    return interview

@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(interview_id: str):
    if interview_id not in interviews_db:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interviews_db[interview_id]

@router.post("/{interview_id}/callback")
async def interview_callback(interview_id: str, results: InterviewCallback):
    if interview_id not in interviews_db:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview = interviews_db[interview_id]
    interview["status"] = "completed"
    interview["scores"] = results.scores
    interview["video_url"] = results.video_url
    interview["key_moments"] = results.key_moments
    
    # Notify Core Backend (optional, or Core can poll)
    # TODO: Implement notification to Core
    
    return {"status": "success"}
