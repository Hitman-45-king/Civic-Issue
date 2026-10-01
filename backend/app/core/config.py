from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    ENV: str = "dev"
    # rate limiting / lockout
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15
    SESSION_TIMEOUT_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
