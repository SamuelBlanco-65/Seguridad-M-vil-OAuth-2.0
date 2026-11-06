"""Módulo de protección Anti-Replay contra ataques de repetición.

Evita que un atacante capture un código TOTP en tránsito y lo vuelva a usar
dentro de la misma ventana de validez de 30 a 90 segundos.
"""

import time
import threading
from typing import Dict, Tuple

class AntiReplayService:
    def __init__(self, ttl_seconds: int = 90):
        self.ttl = ttl_seconds
        # Clave: f"{user_id}:{counter}" -> timestamp de registro
        self._cache: Dict[str, float] = {}
        self._lock = threading.Lock()

    def _cleanup_expired(self, now: float) -> None:
        """Purga entradas que han superado el TTL de 90 segundos."""
        expired_keys = [k for k, timestamp in self._cache.items() if now - timestamp > self.ttl]
        for k in expired_keys:
            del self._cache[k]

    def check_and_register(self, user_id: str, counter: int) -> Tuple[bool, str]:
        """Comprueba de forma atómica si el par (user_id, counter) ya fue utilizado.

        Retorna:
            (True, "OK") si el código es nuevo y fue registrado con éxito.
            (False, "Replay Attack Detected") si ya fue consumido dentro de los 90 segundos.
        """
        key = f"{user_id}:{counter}"
        now = time.time()

        with self._lock:
            self._cleanup_expired(now)

            if key in self._cache:
                return False, "Replay Attack Detected"

            # Registrar uso actual
            self._cache[key] = now
            return True, "OK"

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

anti_replay_service = AntiReplayService(ttl_seconds=90)
