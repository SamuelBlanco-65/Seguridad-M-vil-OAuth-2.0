/**
 * Pruebas unitarias para PKCE (RFC 7636).
 */

import { PkceService } from "../services/PkceService";

describe("Servicio Criptográfico PKCE RFC 7636", () => {
  test("Genera code_verifier de longitud y entropía requerida", () => {
    const verifier = PkceService.generateCodeVerifier(64);
    expect(verifier.length).toBe(64);
    // Verificar que solo contiene caracteres URL-safe permitidos
    expect(/^[A-Za-z0-9\-._~]+$/.test(verifier)).toBe(true);
  });

  test("Rechaza longitudes fuera del rango RFC 7636 (43 a 128)", () => {
    expect(() => PkceService.generateCodeVerifier(42)).toThrow();
    expect(() => PkceService.generateCodeVerifier(129)).toThrow();
  });

  test("Cálculo de code_challenge coincide con Vector Oficial RFC 7636 Appendix B", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expectedChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    const computed = await PkceService.computeCodeChallenge(verifier);
    expect(computed).toBe(expectedChallenge);
  });
});
