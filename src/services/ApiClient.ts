/**
 * Cliente HTTP Modular con Interceptor de Red y Cola Silenciosa (Silent Refresh Queue).
 */

import { SecureTokenStorage } from "./SecureTokenStorage";

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
}

export type SessionExpiredCallback = () => void;

interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  url: string;
  options: RequestOptions;
}

export class ApiClient {
  private baseUrl: string;
  private inMemoryAccessToken: string | null = null;
  private inMemoryElevatedToken: string | null = null;

  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;
  private failedQueue: QueuedRequest[] = [];
  private onSessionExpired: SessionExpiredCallback | null = null;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setAccessToken(token: string | null) {
    this.inMemoryAccessToken = token;
  }

  getAccessToken(): string | null {
    return this.inMemoryAccessToken;
  }

  setElevatedToken(token: string | null) {
    this.inMemoryElevatedToken = token;
  }

  getElevatedToken(): string | null {
    return this.inMemoryElevatedToken;
  }

  setOnSessionExpired(callback: SessionExpiredCallback) {
    this.onSessionExpired = callback;
  }

  private processQueue(error: Error | null, newToken: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject, url, options }) => {
      if (error || !newToken) {
        reject(error || new Error("Fallo en renovación de sesión"));
      } else {
        this.request(url, { ...options, skipRefreshRetry: true })
          .then(resolve)
          .catch(reject);
      }
    });
    this.failedQueue = [];
  }

  private async executeSilentRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = await SecureTokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error("No hay refresh_token disponible en SecureStore");
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          throw new Error(`Refresh rechazado con status: ${response.status}`);
        }

        const data = await response.json();
        const newAccessToken = data.access_token;
        if (!newAccessToken) {
          throw new Error("El backend no retornó access_token");
        }

        this.setAccessToken(newAccessToken);
        this.processQueue(null, newAccessToken);
        return newAccessToken;
      } catch (err) {
        await SecureTokenStorage.clearRefreshToken();
        this.setAccessToken(null);
        this.setElevatedToken(null);
        this.processQueue(err as Error, null);
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const fullUrl = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (!options.skipAuth) {
      const activeToken = (endpoint.includes("/boveda") && this.inMemoryElevatedToken)
        ? this.inMemoryElevatedToken
        : this.inMemoryAccessToken;

      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }
    }

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      if (response.status === 401 && !options.skipRefreshRetry && !endpoint.includes("/auth/refresh")) {
        if (this.isRefreshing) {
          return new Promise<T>((resolve, reject) => {
            this.failedQueue.push({ resolve, reject, url: endpoint, options });
          });
        }

        const newToken = await this.executeSilentRefresh();
        if (newToken) {
          return this.request<T>(endpoint, { ...options, skipRefreshRetry: true });
        } else {
          throw new Error("Sesión expirada. Por favor inicie sesión nuevamente.");
        }
      }

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const error: any = new Error(
          (typeof data === "object" && (data.detail?.message || data.detail || data.error)) ||
          `HTTP Error ${response.status}`
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data as T;
    } catch (error) {
      throw error;
    }
  }

  get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
