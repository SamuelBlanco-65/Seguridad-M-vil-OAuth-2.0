"""Punto de entrada principal para el servidor backend FastAPI.
Universidad de La Sabana — Desarrollo de Aplicaciones Móviles.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api.endpoints import router as api_router

app = FastAPI(
    title="UniSabana Mobile Security Backend",
    description="Backend oficial de apoyo: OAuth 2.0 PKCE, Almacenamiento Criptográfico, Silent Refresh y Step-Up 2FA (RFC 6238).",
    version="1.0.0",
)

# Permitir CORS para desarrollo móvil y web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
