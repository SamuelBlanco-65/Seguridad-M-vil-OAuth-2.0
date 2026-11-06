"""Configuración del sistema backend para el Taller de Seguridad Móvil (UniSabana)."""

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Claves JWT
    JWT_SECRET_KEY: str = "unisabana_dev_secret_key_change_in_production_9f83a21b"
    JWT_ALGORITHM: str = "HS256"

    # Tiempos de vida (minutos/días/segundos)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 5
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ELEVATED_TOKEN_EXPIRE_MINUTES: int = 10
    STEP_UP_TOKEN_EXPIRE_MINUTES: int = 5

    # Parámetros TOTP
    TOTP_PERIOD: int = 30
    ANTI_REPLAY_TTL: int = 90

    # Usuario y Semilla de prueba estándar UniSabana
    DEFAULT_DEMO_SEED: str = "JBSWY3DPEHPK3PXP"
    DEMO_USER_ID: str = "usr_unisabana_01"
    DEMO_USER_EMAIL: str = "estudiante@unisabana.edu.co"
    DEMO_USER_NAME: str = "Estudiante Sabana"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
