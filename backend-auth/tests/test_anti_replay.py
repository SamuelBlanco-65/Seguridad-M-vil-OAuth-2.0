"""Pruebas unitarias para la protección Anti-Replay.
Compatible con pytest y unittest estándar de Python.
"""

import unittest
import time
from app.security.anti_replay import AntiReplayService

class TestAntiReplay(unittest.TestCase):
    def test_anti_replay_prevents_code_reuse(self):
        service = AntiReplayService(ttl_seconds=90)
        user_id = "test_user_01"
        counter = 5000000

        # Primer uso: debe ser aceptado
        allowed1, msg1 = service.check_and_register(user_id, counter)
        self.assertTrue(allowed1)
        self.assertEqual(msg1, "OK")

        # Segundo uso inmediato con el mismo counter: debe ser RECHAZADO
        allowed2, msg2 = service.check_and_register(user_id, counter)
        self.assertFalse(allowed2)
        self.assertIn("Replay Attack Detected", msg2)

    def test_anti_replay_allows_different_counters(self):
        service = AntiReplayService(ttl_seconds=90)
        user_id = "test_user_01"

        allowed1, _ = service.check_and_register(user_id, 100)
        allowed2, _ = service.check_and_register(user_id, 101)

        self.assertTrue(allowed1)
        self.assertTrue(allowed2)

    def test_anti_replay_ttl_expiry(self):
        service = AntiReplayService(ttl_seconds=0.1)
        user_id = "test_user_01"
        counter = 200

        allowed1, _ = service.check_and_register(user_id, counter)
        self.assertTrue(allowed1)

        time.sleep(0.15)

        allowed3, _ = service.check_and_register(user_id, counter)
        self.assertTrue(allowed3)

if __name__ == "__main__":
    unittest.main()
