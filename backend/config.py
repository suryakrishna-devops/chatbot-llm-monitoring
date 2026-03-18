from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    langfuse_public_key: str
    langfuse_secret_key: str
    langfuse_host: str = "http://langfuse-server:3000"

    class Config:
        env_file = ".env"


settings = Settings()
