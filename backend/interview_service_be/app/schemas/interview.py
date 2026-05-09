from pydantic import BaseModel
from typing import List, Optional, Any

class InterviewCreate(BaseModel):
    candidate_id: str
    job_role: str

class ScoreBreakdown(BaseModel):
    category: str
    score: int

class KeyMoment(BaseModel):
    timestamp: str
    title: str
    description: str
    sentiment: str

class InterviewScores(BaseModel):
    overall: int
    label: str
    hire_recommendation: str
    description: str
    breakdown: List[ScoreBreakdown]

class InterviewResponse(BaseModel):
    id: str
    candidate_id: str
    job_role: str
    status: str
    video_url: Optional[str] = None
    scores: Optional[InterviewScores] = None
    key_moments: List[KeyMoment] = []

class InterviewCallback(BaseModel):
    scores: InterviewScores
    video_url: str
    key_moments: List[KeyMoment]
