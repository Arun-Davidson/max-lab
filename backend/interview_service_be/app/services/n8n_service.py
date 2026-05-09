import httpx
from ..configs.config import settings
import logging

logger = logging.getLogger(__name__)

async def trigger_n8n_workflow(interview_id: str, candidate_id: str, job_role: str):
    """
    Triggers the n8n workflow to start the interview process.
    """
    if not settings.N8N_WEBHOOK_URL:
        logger.warning("N8N_WEBHOOK_URL is not set. Skipping workflow trigger.")
        return

    payload = {
        "interview_id": interview_id,
        "candidate_id": candidate_id,
        "job_role": job_role,
        "callback_url": f"/api/v1/interviews/{interview_id}/callback" # n8n should resolve the base URL or we add it to settings
    }
    
    # Correction: The callback should point back to the Python BE which then updates its state and potentially notifies Core.
    # However, if Core polls, Python BE is enough.
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.N8N_WEBHOOK_URL,
                json=payload,
                headers={"Authorization": f"Header {settings.N8N_API_KEY}"} if settings.N8N_API_KEY else {}
            )
            response.raise_for_status()
            logger.info(f"Successfully triggered n8n workflow for interview {interview_id}")
    except Exception as e:
        logger.error(f"Failed to trigger n8n workflow: {str(e)}")
