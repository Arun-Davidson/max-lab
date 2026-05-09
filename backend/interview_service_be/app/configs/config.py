from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "HIRION AI Interview Service"
    API_V1_STR: str = "/api/v1"
    
    # n8n Configuration
    N8N_WEBHOOK_URL: str = ""
    N8N_API_KEY: str = ""
    
    # API Keys for AI & Video
    OPENAI_API_KEY: str = ""
    ZOOM_API_KEY: str = ""
    ZOOM_API_SECRET: str = ""
    
    # Storage
    S3_BUCKET_NAME: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    
    # Core Backend Integration
    CORE_BACKEND_URL: str = "http://localhost:5000"
    CORE_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
