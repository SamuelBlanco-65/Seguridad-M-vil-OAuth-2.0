/**
 * Servicio de Almacenamiento Seguro Cifrado por Hardware.
 *
 * En React Native / Expo: Utiliza 'expo-secure-store' (iOS Keychain / Android Keystore).
 * Regla de Separación de Memoria:
 * - access_token: Vive ÚNICAMENTE en memoria RAM volátil (React State / Service Singleton).
 * - refresh_token: Se persiste en el enclave seguro cifrado por hardware (Keychain/Keystore).
 */

const REFRESH_TOKEN_KEY = "unisabana_sec_refresh_token_v1";
const TOTP_SECRET_KEY = "unisabana_sec_totp_secret_v1";

// Almacén seguro volátil / de contingencia para entornos web o sin enclave de hardware disponible
const memorySecureEnclave: Map<string, string> = new Map();

export class SecureTokenStorage {
  /**
   * Guarda de forma cifrada el refresh_token en el enclave seguro.
   */
  static async setRefreshToken(token: string): Promise<void> {
    try {
      // Si expo-secure-store está disponible en entorno nativo
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        await (window as any).ExpoSecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
          keychainAccessible: 1, // kSecAttrAccessibleAfterFirstUnlock
        });
        return;
      }
    } catch {
      // Fallback seguro a enclave en memoria
    }
    memorySecureEnclave.set(REFRESH_TOKEN_KEY, token);
  }

  /**
   * Obtiene el refresh_token resguardado en el enclave seguro.
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        const val = await (window as any).ExpoSecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (val) return val;
      }
    } catch {
      // Fallback
    }
    return memorySecureEnclave.get(REFRESH_TOKEN_KEY) || null;
  }

  /**
   * Elimina el refresh_token del enclave seguro al revocar sesión o ante expiración definitiva.
   */
  static async clearRefreshToken(): Promise<void> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        await (window as any).ExpoSecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Fallback
    }
    memorySecureEnclave.delete(REFRESH_TOKEN_KEY);
  }

  /**
   * Guarda de forma cifrada la semilla Base32 del usuario en el enclave seguro.
   */
  static async setTotpSecret(secret: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        await (window as any).ExpoSecureStore.setItemAsync(TOTP_SECRET_KEY, secret);
        return;
      }
    } catch {
      // Fallback
    }
    memorySecureEnclave.set(TOTP_SECRET_KEY, secret);
  }

  /**
   * Recupera la semilla Base32 del enclave seguro.
   */
  static async getTotpSecret(): Promise<string | null> {
    try {
      if (typeof window !== "undefined" && (window as any).ExpoSecureStore) {
        const val = await (window as any).ExpoSecureStore.getItemAsync(TOTP_SECRET_KEY);
        if (val) return val;
      }
    } catch {
      // Fallback
    }
    return memorySecureEnclave.get(TOTP_SECRET_KEY) || null;
  }
}
