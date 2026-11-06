/**
 * Decodificador Base32 RFC 4648 implementado desde cero sin dependencias externas.
 * Soporta semillas estándar de TOTP / Google Authenticator.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export class Base32Decoder {
  /**
   * Decodifica una cadena Base32 a un arreglo de bytes Uint8Array.
   * Elimina espacios, guiones y caracteres de padding '='.
   */
  static decode(base32String: string): Uint8Array {
    const cleaned = base32String
      .toUpperCase()
      .replace(/[\s\-_=]/g, "");

    if (cleaned.length === 0) {
      return new Uint8Array(0);
    }

    // Cada carácter Base32 representa 5 bits
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned.charAt(i);
      const val = BASE32_ALPHABET.indexOf(char);

      if (val === -1) {
        throw new Error(`Carácter Base32 no válido encontrado: '${char}' en la posición ${i}`);
      }

      value = (value << 5) | val;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return new Uint8Array(output);
  }

  /**
   * Valida si una cadena cumple con la sintaxis de Base32.
   */
  static isValid(base32String: string): boolean {
    try {
      const cleaned = base32String.toUpperCase().replace(/[\s\-_=]/g, "");
      if (cleaned.length === 0) return false;
      for (let i = 0; i < cleaned.length; i++) {
        if (BASE32_ALPHABET.indexOf(cleaned[i]) === -1) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}
