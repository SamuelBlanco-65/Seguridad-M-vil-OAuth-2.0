"""Endpoints REST de FastAPI para el Laboratorio de Seguridad Móvil (UniSabana)."""

import time
import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Header, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

from ..core.config import settings
from ..security.pkce import verify_code_verifier
from ..security.totp import verify_totp_with_skew, calculate_totp_at_timestamp
from ..security.anti_replay import anti_replay_service
from ..security.tokens import (
    create_access_token,
    create_refresh_token,
    create_step_up_token,
    create_elevated_token,
    decode_token,
)

router = APIRouter()

# Almacenes ligeros en memoria para el laboratorio académico
# En producción se sustituyen por SQLite o base de datos relacional
AUTHORIZATION_CODES: Dict[str, Dict[str, Any]] = {}
REVOKED_REFRESH_TOKENS: set = set()
USER_MFA_SEEDS: Dict[str, str] = {
    settings.DEMO_USER_ID: settings.DEFAULT_DEMO_SEED
}

# Modelos Pydantic de solicitud y respuesta
class TokenExchangeRequest(BaseModel):
    grant_type: str = "authorization_code"
    code: str
    code_verifier: str
    client_id: str
    redirect_uri: str

class RefreshRequest(BaseModel):
    refresh_token: str

class MfaVerifyRequest(BaseModel):
    step_up_token: str
    code: str

class MfaEnrollRequest(BaseModel):
    secret: Optional[str] = None

# Dependencia para extraer y validar Bearer token
def get_current_token_payload(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización faltante o inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    raw_token = authorization.split(" ")[1]
    payload = decode_token(raw_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado o firma criptográfica inválida",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "UniSabana Mobile Security Backend",
        "server_time_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "anti_replay_ttl": settings.ANTI_REPLAY_TTL,
        "totp_period": settings.TOTP_PERIOD,
    }


@router.get("/oauth/authorize")
def oauth_authorize(
    response_type: str,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str,
    state: str,
    prompt_login: bool = False
):
    """Punto de entrada de autorización OAuth 2.0 con PKCE (RFC 7636).
    Se abre en el navegador nativo del sistema (WebBrowser.openAuthSessionAsync).
    """
    if code_challenge_method != "S256":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se admite code_challenge_method=S256 para clientes públicos móviles"
        )

    # Generar código de autorización de un solo uso
    auth_code = f"auth_code_{uuid.uuid4().hex[:16]}"
    AUTHORIZATION_CODES[auth_code] = {
        "code_challenge": code_challenge,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "created_at": time.time(),
        "user_id": settings.DEMO_USER_ID,
        "email": settings.DEMO_USER_EMAIL,
        "name": settings.DEMO_USER_NAME,
        "used": False,
    }

    # Redirección inmediata al Deep Link con el authorization_code y el state original
    callback_url = f"{redirect_uri}?code={auth_code}&state={state}"
    return RedirectResponse(url=callback_url, status_code=status.HTTP_302_FOUND)


@router.post("/auth/oauth/token")
def exchange_oauth_token(body: TokenExchangeRequest):
    """Intercambio de authorization_code por tokens de sesión.
    Valida: SHA256(code_verifier) === code_challenge recibido previamente.
    """
    record = AUTHORIZATION_CODES.get(body.code)
    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código de autorización inválido")

    if record.get("used"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código de autorización ya utilizado")

    # Caducidad del código (máximo 60 segundos)
    if time.time() - record["created_at"] > 60:
        del AUTHORIZATION_CODES[body.code]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código de autorización expirado")

    # Validación criptográfica PKCE
    stored_challenge = record["code_challenge"]
    if not verify_code_verifier(body.code_verifier, stored_challenge):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fallo de verificación PKCE: code_verifier no coincide con code_challenge")

    # Quemar el código de autorización (uso único)
    record["used"] = True

    user_id = record["user_id"]
    email = record["email"]
    name = record["name"]

    access_token = create_access_token(user_id, email, name)
    refresh_token = create_refresh_token(user_id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
        }
    }


@router.post("/auth/refresh")
def refresh_session(body: RefreshRequest):
    """Pipeline de Silent Refresh: canjea refresh_token persistente por nuevo access_token."""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido o expirado")

    jti = payload.get("jti")
    if jti in REVOKED_REFRESH_TOKENS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revocado")

    user_id = payload.get("sub", settings.DEMO_USER_ID)
    email = settings.DEMO_USER_EMAIL
    name = settings.DEMO_USER_NAME

    new_access_token = create_access_token(user_id, email, name)
    return {
        "access_token": new_access_token,
        "token_type": "Bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/auth/logout")
def logout(body: RefreshRequest):
    payload = decode_token(body.refresh_token)
    if payload and payload.get("jti"):
        REVOKED_REFRESH_TOKENS.add(payload["jti"])
    return {"message": "Sesión cerrada y refresh token revocado correctamente"}


@router.get("/auth/me")
def get_current_user(payload: Dict[str, Any] = Depends(get_current_token_payload)):
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "mfa_verified": payload.get("mfa_verified", False),
        "token_type": payload.get("type"),
        "expires_at": payload.get("exp"),
    }


@router.post("/auth/mfa/enroll")
def enroll_mfa(
    body: Optional[MfaEnrollRequest] = None,
    payload: Dict[str, Any] = Depends(get_current_token_payload)
):
    """Registra o consulta la semilla TOTP del usuario."""
    user_id = payload.get("sub", settings.DEMO_USER_ID)
    seed = body.secret if (body and body.secret) else USER_MFA_SEEDS.get(user_id, settings.DEFAULT_DEMO_SEED)
    USER_MFA_SEEDS[user_id] = seed.strip().upper()

    issuer = "UniSabana"
    account = payload.get("email", settings.DEMO_USER_EMAIL)
    otpauth_uri = f"otpauth://totp/{issuer}:{account}?secret={USER_MFA_SEEDS[user_id]}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"

    return {
        "secret": USER_MFA_SEEDS[user_id],
        "issuer": issuer,
        "account": account,
        "otpauth_uri": otpauth_uri,
        "digits": 6,
        "period": 30,
        "algorithm": "SHA1"
    }


@router.get("/api/boveda-critica")
def access_boveda_critica(payload: Dict[str, Any] = Depends(get_current_token_payload)):
    """Recurso Protegido de Alto Valor.
    Si el access_token ordinario tiene claim mfa_verified: false, responde 403 Forbidden
    con error: "mfa_required" y un step_up_token temporal para iniciar 2FA.
    """
    user_id = payload.get("sub", settings.DEMO_USER_ID)
    is_mfa_verified = payload.get("mfa_verified", False)

    if not is_mfa_verified:
        step_up_token = create_step_up_token(user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "mfa_required",
                "message": "Step-Up 2FA requerido: este recurso contiene datos críticos y exige elevación de privilegios.",
                "step_up_token": step_up_token,
                "step_up_expires_in": settings.STEP_UP_TOKEN_EXPIRE_MINUTES * 60,
            }
        )

    # Si mfa_verified es True, entregar datos de la Bóveda Crítica
    return {
        "status": "authorized",
        "security_level": "ELEVATED_MFA_ACTIVE",
        "data": {
            "vault_id": "VAULT-UNISABANA-SEC-2026",
            "clearance": "NIVEL_5_CONFIDENCIAL",
            "account_balance": "$124,500,000 COP",
            "active_crypto_keys": [
                {"alias": "Production-Master-Signer", "fingerprint": "SHA256:7a9c8b0e1d2f3a4b"},
                {"alias": "Database-TDE-Enclave-Key", "fingerprint": "SHA256:1e2d3c4b5a6f7e8d"}
            ],
            "access_logs_retention_days": 365,
            "session_elevated_until": payload.get("exp"),
        }
    }


@router.post("/auth/mfa/verify")
def verify_mfa_step_up(body: MfaVerifyRequest):
    """Punto de elevación Step-Up: valida código TOTP con Clock Skew y Caché Anti-Replay.

    1. Valida el step_up_token.
    2. Comprueba el código con ventanas C-1, C, C+1.
    3. Verifica y bloquea en la caché Anti-Replay con TTL de 90 segundos.
    4. Emite elevated_token con claim mfa_verified: true (TTL 10m).
    """
    step_up_payload = decode_token(body.step_up_token)
    if not step_up_payload or step_up_payload.get("type") != "step_up":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de Step-Up inválido o expirado"
        )

    user_id = step_up_payload.get("sub", settings.DEMO_USER_ID)
    secret = USER_MFA_SEEDS.get(user_id, settings.DEFAULT_DEMO_SEED)

    # 1. Validación de código TOTP con Clock Skew
    is_valid, matched_counter = verify_totp_with_skew(secret, body.code, period=settings.TOTP_PERIOD)
    if not is_valid or matched_counter is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código TOTP inválido o fuera de ventana temporal"
        )

    # 2. Protección Anti-Replay (bloquea reutilización dentro de 90 segundos)
    allowed, message = anti_replay_service.check_and_register(user_id, matched_counter)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Replay Attack Detected: Este código TOTP ya fue consumido en la ventana {matched_counter}. Anti-Replay TTL: 90s."
        )

    # 3. Emisión de sesión elevada (elevated_token)
    elevated_token = create_elevated_token(
        user_id=user_id,
        email=settings.DEMO_USER_EMAIL,
        name=settings.DEMO_USER_NAME
    )

    return {
        "success": True,
        "message": "Step-Up 2FA verificado con éxito. Privilegios elevados.",
        "elevated_token": elevated_token,
        "token_type": "Bearer",
        "expires_in": settings.ELEVATED_TOKEN_EXPIRE_MINUTES * 60,
        "mfa_verified": True,
        "validated_counter": matched_counter,
    }
