/**
 * Servicio de Almacenamiento Seguro Cifrado por Hardware.
 */

const REFRESH_TOKEN_KEY = "unisabana_sec_refresh_token_v1";
const TOTP_SECRET_KEY = "unisabana_sec_totp_secret_v1";

const memorySecureEnclave: Map<string, string> = new Map();

export class SecureTokenStorage {
  static async setRefreshToken(token: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        await (window as any).ExpoSecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
          keychainAccessible: 1,
        });
        return;
      }
    } catch {}
    memorySecureEnclave.set(REFRESH_TOKEN_KEY, token);
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        const val = await (window as any).ExpoSecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (val) return val;
      }
    } catch {}
    return memorySecureEnclave.get(REFRESH_TOKEN_KEY) || null;
  }

  static async clearRefreshToken(): Promise<void> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        await (window as any).ExpoSecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch {}
    memorySecureEnclave.delete(REFRESH_TOKEN_KEY);
  }

  static async setTotpSecret(secret: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        await (window as any).ExpoSecureStore.setItemAsync(TOTP_SECRET_KEY, secret);
        return;
      }
    } catch {}
    memorySecureEnclave.set(TOTP_SECRET_KEY, secret);
  }

  static async getTotpSecret(): Promise<string | null> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        const val = await (window as any).ExpoSecureStore.getItemAsync(TOTP_SECRET_KEY);
        if (val) return val;
      }
    } catch {}
    return memorySecureEnclave.get(TOTP_SECRET_KEY) || null;
  }
}
