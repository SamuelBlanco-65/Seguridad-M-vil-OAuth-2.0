"""Pruebas unitarias para TOTP (RFC 6238).
Compatible con pytest y unittest estándar de Python.
"""

import unittest
from app.security.totp import (
    clean_base32_secret,
    calculate_totp_at_timestamp,
    verify_totp_with_skew,
    generate_totp_code
)

RFC_6238_BASE32_KEY = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

class TestTotp(unittest.TestCase):
    def test_rfc_6238_official_vectors(self):
        secret_bytes = clean_base32_secret(RFC_6238_BASE32_KEY)

        # 8 Dígitos oficiales de la Tabla 1 del RFC 6238
        self.assertEqual(generate_totp_code(secret_bytes, 1, 8), "94287082")
        self.assertEqual(generate_totp_code(secret_bytes, 37037036, 8), "07081804")
        self.assertEqual(generate_totp_code(secret_bytes, 37037037, 8), "14050471")
        self.assertEqual(generate_totp_code(secret_bytes, 41152263, 8), "89005924")
        self.assertEqual(generate_totp_code(secret_bytes, 66666666, 8), "69279037")

        # 6 Dígitos correspondientes al perfil estándar de Google Authenticator
        self.assertEqual(generate_totp_code(secret_bytes, 1, 6), "287082")
        self.assertEqual(generate_totp_code(secret_bytes, 37037036, 6), "081804")
        self.assertEqual(generate_totp_code(secret_bytes, 37037037, 6), "050471")
        self.assertEqual(generate_totp_code(secret_bytes, 41152263, 6), "005924")
        self.assertEqual(generate_totp_code(secret_bytes, 66666666, 6), "279037")

    def test_totp_clock_skew_tolerance(self):
        seed = "JBSWY3DPEHPK3PXP"
        current_code, counter, _ = calculate_totp_at_timestamp(seed)

        is_valid, matched_counter = verify_totp_with_skew(seed, current_code)
        self.assertTrue(is_valid)
        self.assertEqual(matched_counter, counter)

        is_valid_wrong, _ = verify_totp_with_skew(seed, "000000")
        if current_code != "000000":
            self.assertFalse(is_valid_wrong)

if __name__ == "__main__":
    unittest.main()
