"""Módulo de validación PKCE (RFC 7636).

Las aplicaciones móviles son Public Clients y no pueden proteger un client_secret.
PKCE valida criptográficamente que quien canjea el authorization_code
es el mismo que inició la solicitud en el navegador nativo.
"""

import hashlib
import base64
import re

def compute_code_challenge(code_verifier: str) -> str:
    """Calcula el code_challenge a partir del code_verifier según RFC 7636:
    code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier))) sin relleno '='.
    """
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")

def verify_code_verifier(code_verifier: str, stored_challenge: str) -> bool:
    """Verifica que el code_verifier coincida exactamente con el code_challenge recibido en /oauth/authorize."""
    if not code_verifier or not stored_challenge:
        return False

    # Validar longitud y caracteres según RFC 7636 (43 a 128 caracteres [A-Z, a-z, 0-9, -, ., _, ~])
    if len(code_verifier) < 43 or len(code_verifier) > 128:
        return False

    if not re.match(r"^[A-Za-z0-9\-._~]+$", code_verifier):
        return False

    computed = compute_code_challenge(code_verifier)
    return computed == stored_challenge
