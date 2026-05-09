from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.v1 import interviews
from .configs.config import settings

app = FastAPI(
    title="HIRION AI Interview Service",
    description="Backend service for managing AI-powered interviews and n8n orchestration.",
    version="1.0.0",
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interviews.router, prefix="/api/v1/interviews", tags=["interviews"])

@app.get("/")
async def root():
    return {"message": "Welcome to HIRION AI Interview Service API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
