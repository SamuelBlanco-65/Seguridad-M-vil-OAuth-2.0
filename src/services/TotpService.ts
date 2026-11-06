/**
 * Módulo Criptográfico TOTP (RFC 6238) Implementado desde Cero sin Librerías de Alto Nivel.
 * Regla Inviolable del Laboratorio: Cero 'otplib', cero 'speakeasy'.
 */

import { Base32Decoder } from "./Base32Decoder";
import { TotpResult, TotpAccount } from "../types";

export class TotpService {
  static counterToBigEndianBytes(counter: number): Uint8Array {
    const buffer = new Uint8Array(8);
    const high = Math.floor(counter / 0x100000000);
    const low = counter >>> 0;

    buffer[0] = (high >>> 24) & 0xff;
    buffer[1] = (high >>> 16) & 0xff;
    buffer[2] = (high >>> 8) & 0xff;
    buffer[3] = high & 0xff;
    buffer[4] = (low >>> 24) & 0xff;
    buffer[5] = (low >>> 16) & 0xff;
    buffer[6] = (low >>> 8) & 0xff;
    buffer[7] = low & 0xff;

    return buffer;
  }

  static sha1(data: Uint8Array): Uint8Array {
    function rotl(n: number, s: number) {
      return (n << s) | (n >>> (32 - s));
    }

    const byteLen = data.length;
    const bitLen = byteLen * 8;
    const padLen = (byteLen % 64 < 56) ? (56 - (byteLen % 64)) : (120 - (byteLen % 64));
    const totalLen = byteLen + padLen + 8;
    const block = new Uint8Array(totalLen);
    block.set(data);
    block[byteLen] = 0x80;

    const view = new DataView(block.buffer);
    view.setUint32(totalLen - 4, bitLen, false);

    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;

    const w = new Uint32Array(80);

    for (let i = 0; i < totalLen; i += 64) {
      for (let t = 0; t < 16; t++) {
        w[t] = view.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 80; t++) {
        w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
      }

      let a = h0, b = h1, c = h2, d = h3, e = h4;

      for (let t = 0; t < 80; t++) {
        let f = 0, k = 0;
        if (t < 20) {
          f = (b & c) | ((~b) & d);
          k = 0x5a827999;
        } else if (t < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (t < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }

        const temp = (rotl(a, 5) + f + e + k + w[t]) >>> 0;
        e = d; d = c; c = rotl(b, 30); b = a; a = temp;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
    }

    const result = new Uint8Array(20);
    const resView = new DataView(result.buffer);
    resView.setUint32(0, h0, false);
    resView.setUint32(4, h1, false);
    resView.setUint32(8, h2, false);
    resView.setUint32(12, h3, false);
    resView.setUint32(16, h4, false);
    return result;
  }

  static hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
    const blockSize = 64;
    let kPrime = new Uint8Array(blockSize);

    if (key.length > blockSize) {
      const hashedKey = this.sha1(key);
      kPrime.set(hashedKey);
    } else {
      kPrime.set(key);
    }

    const ipad = new Uint8Array(blockSize);
    const opad = new Uint8Array(blockSize);

    for (let i = 0; i < blockSize; i++) {
      ipad[i] = kPrime[i] ^ 0x36;
      opad[i] = kPrime[i] ^ 0x5c;
    }

    const inner = new Uint8Array(blockSize + message.length);
    inner.set(ipad, 0);
    inner.set(message, blockSize);
    const innerHash = this.sha1(inner);

    const outer = new Uint8Array(blockSize + 20);
    outer.set(opad, 0);
    outer.set(innerHash, blockSize);
    return this.sha1(outer);
  }

  static truncate(h: Uint8Array, digits: number = 6): string {
    const offset = h[19] & 0x0f;
    const binCode =
      ((h[offset] & 0x7f) << 24) |
      ((h[offset + 1] & 0xff) << 16) |
      ((h[offset + 2] & 0xff) << 8) |
      (h[offset + 3] & 0xff);

    const modulo = Math.pow(10, digits);
    const totp = binCode % modulo;
    return totp.toString().padStart(digits, "0");
  }

  static generateForCounter(secretBase32: string, counter: number, digits: number = 6): string {
    const secretBytes = Base32Decoder.decode(secretBase32);
    const timeBytes = this.counterToBigEndianBytes(counter);
    const hmac = this.hmacSha1(secretBytes, timeBytes);
    return this.truncate(hmac, digits);
  }

  static computeCurrent(
    secretBase32: string,
    period: number = 30,
    digits: number = 6,
    forcedTimestamp?: number
  ): TotpResult {
    const timestamp = forcedTimestamp ?? Math.floor(Date.now() / 1000);
    const counter = Math.floor(timestamp / period);
    const remainingSeconds = period - (timestamp % period);
    const progressPercent = (remainingSeconds / period) * 100;
    const code = this.generateForCounter(secretBase32, counter, digits);

    return {
      code,
      counter,
      remainingSeconds,
      progressPercent,
    };
  }

  static parseOtpAuthUri(uri: string): TotpAccount | null {
    try {
      if (!uri.startsWith("otpauth://totp/")) return null;
      const url = new URL(uri);
      const secret = url.searchParams.get("secret") || "";
      const issuerParam = url.searchParams.get("issuer") || "UniSabana";
      const digits = parseInt(url.searchParams.get("digits") || "6", 10);
      const period = parseInt(url.searchParams.get("period") || "30", 10);
      const algorithm = (url.searchParams.get("algorithm") || "SHA1").toUpperCase();

      const pathname = decodeURIComponent(url.pathname.replace(/^\/\/?/, ""));
      let account = pathname;
      let issuer = issuerParam;

      if (pathname.includes(":")) {
        const parts = pathname.split(":");
        issuer = parts[0];
        account = parts.slice(1).join(":");
      }

      if (!Base32Decoder.isValid(secret)) return null;

      return {
        issuer,
        account,
        secret,
        digits: isNaN(digits) ? 6 : digits,
        period: isNaN(period) ? 30 : period,
        algorithm,
      };
    } catch {
      return null;
    }
  }
}
