"""Pruebas unitarias para PKCE (RFC 7636).
Compatible con pytest y unittest estándar de Python.
"""

import unittest
from app.security.pkce import compute_code_challenge, verify_code_verifier

class TestPkce(unittest.TestCase):
    def test_pkce_rfc_7636_vector(self):
        # Vector de prueba estándar RFC 7636 Appendix B
        verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        expected_challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        computed = compute_code_challenge(verifier)
        self.assertEqual(computed, expected_challenge)
        self.assertTrue(verify_code_verifier(verifier, expected_challenge))

    def test_pkce_rejects_invalid_verifier(self):
        verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        wrong_challenge = "WrongChallengeBase64UrlStringWithoutEqualSigns"
        self.assertFalse(verify_code_verifier(verifier, wrong_challenge))

    def test_pkce_rejects_short_or_long_verifier(self):
        short_v = "too_short_less_than_43_chars"
        self.assertFalse(verify_code_verifier(short_v, "some_challenge"))

        long_v = "a" * 129
        self.assertFalse(verify_code_verifier(long_v, "some_challenge"))

if __name__ == "__main__":
    unittest.main()
