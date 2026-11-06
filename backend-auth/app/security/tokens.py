"""Gestión del ciclo de vida de tokens criptográficos (JWT).

Tipos de Tokens:
1. access_token: vida útil 5 min, en memoria RAM volátil, claim mfa_verified: false.
2. refresh_token: vida útil 30 días, guardado en SecureStore, permite renovación silenciosa.
3. step_up_token: vida útil 5 min, emitido ante 403 Forbidden para solicitar 2FA.
4. elevated_token: vida útil 10 min, claim mfa_verified: true, autoriza /api/boveda-critica.
"""

import time
import uuid
from typing import Dict, Any, Optional
import jwt
from ..core.config import settings

def create_access_token(user_id: str, email: str, name: str) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "type": "access",
        "mfa_verified": False,
        "iat": now,
        "exp": now + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + (settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_step_up_token(user_id: str) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "type": "step_up",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + (settings.STEP_UP_TOKEN_EXPIRE_MINUTES * 60)
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_elevated_token(user_id: str, email: str, name: str) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "type": "elevated",
        "mfa_verified": True,
        "iat": now,
        "exp": now + (settings.ELEVATED_TOKEN_EXPIRE_MINUTES * 60)
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None
