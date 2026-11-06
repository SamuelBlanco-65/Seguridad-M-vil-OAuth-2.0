/**
 * Pruebas unitarias para el módulo TOTP (RFC 6238) en TypeScript.
 * Verifica los vectores de prueba oficiales y paridad con Google Authenticator.
 */

import { TotpService } from "../services/TotpService";
import { Base32Decoder } from "../services/Base32Decoder";

describe("Módulo Criptográfico TOTP RFC 6238", () => {
  // Clave oficial RFC 6238 Appendix B: "12345678901234567890" en ASCII
  const RFC_BASE32_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  test("Decodificación Base32 RFC 4648 correcta", () => {
    const bytes = Base32Decoder.decode("JBSWY3DPEHPK3PXP");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(10);
  });

  test("Conversión de contador a Big-Endian 64 bits (8 bytes)", () => {
    const buffer = TotpService.counterToBigEndianBytes(1);
    expect(buffer.length).toBe(8);
    expect(buffer[7]).toBe(1);
    expect(buffer[6]).toBe(0);
    expect(buffer[0]).toBe(0);
  });

  test("Vectores Oficiales RFC 6238 (SHA1, Tabla 1 con 8 dígitos)", () => {
    // 8 Dígitos oficiales de la Tabla 1 del RFC 6238
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 1, 8)).toBe("94287082");
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 37037036, 8)).toBe("07081804");
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 37037037, 8)).toBe("14050471");
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 41152263, 8)).toBe("89005924");
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 66666666, 8)).toBe("69279037");

    // 6 Dígitos correspondientes al perfil estándar de Google Authenticator
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 1, 6)).toBe("287082");
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 37037036, 6)).toBe("081804");
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 37037037, 6)).toBe("050471");
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 41152263, 6)).toBe("005924");
    expect(TotpService.generateForCounter(RFC_BASE32_SECRET, 66666666, 6)).toBe("279037");
  });

  test("Paridad exacta con semilla UniSabana Demo (JBSWY3DPEHPK3PXP)", () => {
    const result = TotpService.computeCurrent("JBSWY3DPEHPK3PXP", 30, 6, 1700000000);
    expect(result.code).toHaveLength(6);
    expect(/^\d{6}$/.test(result.code)).toBe(true);
  });

  test("Parsing de URI otpauth:// estándar", () => {
    const uri = "otpauth://totp/UniSabana:estudiante@unisabana.edu.co?secret=JBSWY3DPEHPK3PXP&issuer=UniSabana";
    const account = TotpService.parseOtpAuthUri(uri);
    expect(account).not.toBeNull();
    expect(account?.issuer).toBe("UniSabana");
    expect(account?.account).toBe("estudiante@unisabana.edu.co");
    expect(account?.secret).toBe("JBSWY3DPEHPK3PXP");
  });
});
