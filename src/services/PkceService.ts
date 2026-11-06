/**
 * Servicio Criptográfico PKCE (RFC 7636) para Clientes Públicos Móviles.
 * Genera code_verifier de alta entropía y code_challenge en Base64URL sin relleno '='.
 */

import { PkcePair } from "../types";

const URL_SAFE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export class PkceService {
  static generateCodeVerifier(length: number = 64): string {
    if (length < 43 || length > 128) {
      throw new Error("code_verifier debe tener entre 43 y 128 caracteres según RFC 7636");
    }

    const randomBytes = new Uint8Array(length);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < length; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }

    let verifier = "";
    for (let i = 0; i < length; i++) {
      verifier += URL_SAFE_CHARS.charAt(randomBytes[i] % URL_SAFE_CHARS.length);
    }
    return verifier;
  }

  static generateState(length: number = 32): string {
    return this.generateCodeVerifier(length);
  }

  static toBase64Url(buffer: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binary);
    return base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  static async computeCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);

    if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      return this.toBase64Url(new Uint8Array(hashBuffer));
    }

    return this.toBase64Url(this.pureSha256(data));
  }

  static async generatePkcePair(length: number = 64): Promise<PkcePair> {
    const verifier = this.generateCodeVerifier(length);
    const challenge = await this.computeCodeChallenge(verifier);
    return { verifier, challenge };
  }

  private static pureSha256(bytes: Uint8Array): Uint8Array {
    function rightRotate(value: number, amount: number) {
      return (value >>> amount) | (value << (32 - amount));
    }

    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
    let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

    const originalLength = bytes.length;
    const bitLength = originalLength * 8;
    const paddingLength = (originalLength % 64 < 56) ? (56 - (originalLength % 64)) : (120 - (originalLength % 64));
    const totalLength = originalLength + paddingLength + 8;
    const padded = new Uint8Array(totalLength);
    padded.set(bytes);
    padded[originalLength] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(totalLength - 4, bitLength, false);

    const w = new Uint32Array(64);
    for (let i = 0; i < totalLength; i += 64) {
      for (let t = 0; t < 16; t++) {
        w[t] = view.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }

      let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

      for (let t = 0; t < 64; t++) {
        const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;

        h = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }

      H0 = (H0 + a) >>> 0; H1 = (H1 + b) >>> 0; H2 = (H2 + c) >>> 0; H3 = (H3 + d) >>> 0;
      H4 = (H4 + e) >>> 0; H5 = (H5 + f) >>> 0; H6 = (H6 + g) >>> 0; H7 = (H7 + h) >>> 0;
    }

    const result = new Uint8Array(32);
    const resultView = new DataView(result.buffer);
    resultView.setUint32(0, H0, false);
    resultView.setUint32(4, H1, false);
    resultView.setUint32(8, H2, false);
    resultView.setUint32(12, H3, false);
    resultView.setUint32(16, H4, false);
    resultView.setUint32(20, H5, false);
    resultView.setUint32(24, H6, false);
    resultView.setUint32(28, H7, false);
    return result;
  }
}
