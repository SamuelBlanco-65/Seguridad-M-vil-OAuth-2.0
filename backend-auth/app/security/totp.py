"""Módulo de cálculo y verificación TOTP (RFC 6238) sin librerías de alto nivel.

Implementación desde cero utilizando primitivas criptográficas estándar (HMAC-SHA1,
empaquetado Big-Endian de 64 bits y Truncamiento Dinámico).
"""

import hmac
import hashlib
import struct
import time
import base64
from typing import Tuple, Optional

def clean_base32_secret(secret: str) -> bytes:
    """Normaliza y decodifica una semilla Base32 RFC 4648 a bytes, agregando padding '=' si es necesario."""
    cleaned = secret.strip().replace(" ", "").upper()
    # Base32 requiere múltiplos de 8 caracteres
    missing_padding = len(cleaned) % 8
    if missing_padding != 0:
        cleaned += "=" * (8 - missing_padding)
    return base64.b32decode(cleaned, casefold=True)

def generate_totp_code(secret_bytes: bytes, counter: int, digits: int = 6) -> str:
    """Calcula un código TOTP a partir de la semilla en bytes y el contador temporal.

    1. Contador T en formato Big-Endian (8 bytes, entero de 64 bits)
    2. H = HMAC-SHA1(secret, T) [20 bytes]
    3. Dynamic Truncation (offset = H[19] & 0x0F)
    4. Extracción de 4 bytes consecutivos en big-endian con máscara 0x7FFFFFFF
    5. Modulo 10^digits formateado con ceros a la izquierda
    """
    counter_bytes = struct.pack(">Q", counter)
    h = hmac.new(secret_bytes, counter_bytes, hashlib.sha1).digest()

    offset = h[19] & 0x0F
    bin_code = struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF
    totp = bin_code % (10 ** digits)
    return str(totp).zfill(digits)

def calculate_totp_at_timestamp(secret: str, timestamp: Optional[float] = None, period: int = 30) -> Tuple[str, int, int]:
    """Calcula el código TOTP para un timestamp dado (o el actual).

    Retorna: (código de 6 dígitos, contador T, segundos restantes en la ventana).
    """
    ts = timestamp if timestamp is not None else time.time()
    counter = int(ts // period)
    time_remaining = period - int(ts % period)
    secret_bytes = clean_base32_secret(secret)
    code = generate_totp_code(secret_bytes, counter)
    return code, counter, time_remaining

def verify_totp_with_skew(secret: str, user_code: str, period: int = 30) -> Tuple[bool, Optional[int]]:
    """Verifica el código TOTP con tolerancia a desfase de reloj (Clock Skew).

    Valida en tres ventanas temporales según RFC 6238:
    - C - 1 (t - 30s)
    - C     (t actual)
    - C + 1 (t + 30s)

    Retorna: (es_valido, contador_temporal_coincidente).
    """
    user_code = user_code.strip()
    if len(user_code) != 6 or not user_code.isdigit():
        return False, None

    try:
        secret_bytes = clean_base32_secret(secret)
    except Exception:
        return False, None

    current_counter = int(time.time() // period)
    # Ventanas a evaluar: C, C-1, C+1
    candidate_counters = [current_counter, current_counter - 1, current_counter + 1]

    for c in candidate_counters:
        expected = generate_totp_code(secret_bytes, c)
        if hmac.compare_digest(expected, user_code):
            return True, c

    return False, None
