/**
 * Gestor Centralizado de Sesión y Autenticación Móvil (AuthContext).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { AuthState, UserProfile, StepUpChallenge, TotpAccount, VaultSecretData } from "../types";
import { PkceService } from "../services/PkceService";
import { SecureTokenStorage } from "../services/SecureTokenStorage";
import { apiClient } from "../services/ApiClient";
import { TotpService } from "../services/TotpService";

interface AuthContextType {
  authState: AuthState;
  user: UserProfile | null;
  accessToken: string | null;
  elevatedToken: string | null;
  stepUpChallenge: StepUpChallenge | null;
  isAirplaneMode: boolean;
  totpAccount: TotpAccount;
  vaultData: VaultSecretData | null;
  lastError: string | null;
  networkLogs: Array<{
    id: string;
    timestamp: string;
    method: string;
    url: string;
    status: number;
    details: string;
  }>;
  startOAuthLogin: () => Promise<{ success: boolean; url?: string; error?: string }>;
  handleOAuthCallback: (callbackUrl: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  fetchVaultData: () => Promise<{ success: boolean; data?: VaultSecretData; mfaRequired?: boolean }>;
  submitStepUp2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  updateTotpSecret: (newSecret: string) => Promise<boolean>;
  setAirplaneMode: (enabled: boolean) => void;
  clearStepUpChallenge: () => void;
  addNetworkLog: (method: string, url: string, status: number, details: string) => void;
}

const DEFAULT_TOTP_ACCOUNT: TotpAccount = {
  issuer: "UniSabana",
  account: "estudiante@unisabana.edu.co",
  secret: "JBSWY3DPEHPK3PXP",
  digits: 6,
  period: 30,
  algorithm: "SHA1",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>("INITIALIZING");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [elevatedToken, setElevatedToken] = useState<string | null>(null);
  const [stepUpChallenge, setStepUpChallenge] = useState<StepUpChallenge | null>(null);
  const [isAirplaneMode, setIsAirplaneMode] = useState<boolean>(false);
  const [totpAccount, setTotpAccount] = useState<TotpAccount>(DEFAULT_TOTP_ACCOUNT);
  const [vaultData, setVaultData] = useState<VaultSecretData | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingPkce, setPendingPkce] = useState<{ verifier: string; state: string } | null>(null);

  const [networkLogs, setNetworkLogs] = useState<Array<{
    id: string;
    timestamp: string;
    method: string;
    url: string;
    status: number;
    details: string;
  }>>([]);

  const addNetworkLog = useCallback((method: string, url: string, status: number, details: string) => {
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour12: false });
    setNetworkLogs((prev) => [
      { id: `${Date.now()}_${Math.random()}`, timestamp: timeStr, method, url, status, details },
      ...prev.slice(0, 49),
    ]);
  }, []);

  useEffect(() => {
    apiClient.setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    apiClient.setElevatedToken(elevatedToken);
  }, [elevatedToken]);

  useEffect(() => {
    apiClient.setOnSessionExpired(() => {
      setAccessToken(null);
      setElevatedToken(null);
      setUser(null);
      setAuthState("SESSION_EXPIRED");
      addNetworkLog("EVENT", "SessionExpired", 401, "Refresh token inválido/revocado. Almacenamiento seguro desalojado.");
    });
  }, [addNetworkLog]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedSecret = await SecureTokenStorage.getTotpSecret();
        if (savedSecret) {
          setTotpAccount((prev) => ({ ...prev, secret: savedSecret }));
        }

        const storedRefreshToken = await SecureTokenStorage.getRefreshToken();
        if (storedRefreshToken) {
          setAuthState("REFRESHING");
          try {
            const data = await apiClient.post("/auth/refresh", { refresh_token: storedRefreshToken }, { skipAuth: true });
            setAccessToken(data.access_token);
            setUser({
              id: "usr_unisabana_01",
              email: "estudiante@unisabana.edu.co",
              name: "Estudiante UniSabana",
              mfa_verified: false,
            });
            setAuthState("AUTHENTICATED");
            addNetworkLog("POST", "/auth/refresh", 200, "Sesión reanudada con éxito vía hardware enclave.");
          } catch {
            await SecureTokenStorage.clearRefreshToken();
            setAuthState("UNAUTHENTICATED");
          }
        } else {
          setAuthState("UNAUTHENTICATED");
        }
      } catch (err: any) {
        setLastError(err.message);
        setAuthState("UNAUTHENTICATED");
      }
    };
    bootstrap();
  }, [addNetworkLog]);

  const startOAuthLogin = async () => {
    try {
      setAuthState("AUTHENTICATING");
      setLastError(null);

      const pkce = await PkceService.generatePkcePair(64);
      const state = PkceService.generateState(32);

      setPendingPkce({ verifier: pkce.verifier, state });

      const redirectUri = "unisabana-auth://callback";
      const clientId = "unisabana_mobile_client";

      const authUrl = `/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${encodeURIComponent(pkce.challenge)}&code_challenge_method=S256&state=${encodeURIComponent(state)}`;

      addNetworkLog("INIT_OAUTH", "/oauth/authorize", 302, `PKCE Verifier generado (64 chars), Challenge Base64URL=${pkce.challenge.substring(0, 16)}..., State=${state.substring(0, 8)}...`);

      return { success: true, url: authUrl };
    } catch (err: any) {
      setAuthState("ERROR");
      setLastError(err.message);
      return { success: false, error: err.message };
    }
  };

  const handleOAuthCallback = async (callbackUrl: string): Promise<boolean> => {
    try {
      const url = new URL(callbackUrl);
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");

      if (!pendingPkce) {
        throw new Error("No hay solicitud de autenticación PKCE pendiente en memoria");
      }

      if (!returnedState || returnedState !== pendingPkce.state) {
        addNetworkLog("CALLBACK", "Anti-CSRF Failed", 400, `State no coincide: recibido ${returnedState} vs esperado ${pendingPkce.state}`);
        throw new Error("Violación de seguridad: El parámetro state no coincide (Posible ataque CSRF)");
      }

      if (!code) {
        throw new Error("El callback no incluyó el código de autorización");
      }

      addNetworkLog("CALLBACK", "DeepLink Received", 200, `State anti-CSRF validado. Canjeando code con code_verifier...`);

      const tokenResp = await apiClient.post("/auth/oauth/token", {
        grant_type: "authorization_code",
        code,
        code_verifier: pendingPkce.verifier,
        client_id: "unisabana_mobile_client",
        redirect_uri: "unisabana-auth://callback",
      }, { skipAuth: true });

      setAccessToken(tokenResp.access_token);
      await SecureTokenStorage.setRefreshToken(tokenResp.refresh_token);

      setUser(tokenResp.user);
      setAuthState("AUTHENTICATED");
      setPendingPkce(null);

      addNetworkLog("POST", "/auth/oauth/token", 200, `Token Exchange exitoso. access_token en RAM (5m), refresh_token en SecureStore (30d).`);
      return true;
    } catch (err: any) {
      setLastError(err.message);
      setAuthState("ERROR");
      return false;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await SecureTokenStorage.getRefreshToken();
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refresh_token: refreshToken }, { skipAuth: true });
        addNetworkLog("POST", "/auth/logout", 200, "Sesión revocada en el backend.");
      }
    } catch {
    } finally {
      await SecureTokenStorage.clearRefreshToken();
      setAccessToken(null);
      setElevatedToken(null);
      setUser(null);
      setVaultData(null);
      setStepUpChallenge(null);
      setAuthState("UNAUTHENTICATED");
      addNetworkLog("EVENT", "Logout", 200, "Memoria RAM limpiada y SecureStore desalojado.");
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const refreshToken = await SecureTokenStorage.getRefreshToken();
      if (!refreshToken) return false;
      const data = await apiClient.post("/auth/refresh", { refresh_token: refreshToken }, { skipAuth: true });
      setAccessToken(data.access_token);
      addNetworkLog("POST", "/auth/refresh", 200, "Silent Refresh exitoso: nuevo access_token almacenado en RAM.");
      return true;
    } catch {
      return false;
    }
  };

  const fetchVaultData = async () => {
    try {
      const data = await apiClient.get<VaultSecretData>("/api/boveda-critica");
      setVaultData(data);
      addNetworkLog("GET", "/api/boveda-critica", 200, "Acceso concedido a Bóveda Crítica con elevated_token.");
      return { success: true, data };
    } catch (err: any) {
      if (err.status === 403 && err.data?.detail?.error === "mfa_required") {
        const challenge: StepUpChallenge = err.data.detail;
        setStepUpChallenge(challenge);
        addNetworkLog("GET", "/api/boveda-critica", 403, "Step-Up requerido. Capturado 403 Forbidden con step_up_token.");
        return { success: false, mfaRequired: true };
      }
      addNetworkLog("GET", "/api/boveda-critica", err.status || 500, `Acceso denegado: ${err.message}`);
      return { success: false, error: err.message };
    }
  };

  const submitStepUp2FA = async (code: string) => {
    if (!stepUpChallenge) {
      return { success: false, error: "No hay desafío de Step-Up activo" };
    }

    try {
      const resp = await apiClient.post("/auth/mfa/verify", {
        step_up_token: stepUpChallenge.step_up_token,
        code,
      }, { skipAuth: true });

      setElevatedToken(resp.elevated_token);
      setStepUpChallenge(null);

      addNetworkLog("POST", "/auth/mfa/verify", 200, `Step-Up verificado con éxito. elevated_token recibido (TTL 10m, claim mfa_verified: true).`);

      await fetchVaultData();
      return { success: true };
    } catch (err: any) {
      const status = err.status || 400;
      const detailMsg = err.data?.detail || err.message;
      addNetworkLog("POST", "/auth/mfa/verify", status, `Fallo Step-Up: ${detailMsg}`);
      return { success: false, error: detailMsg };
    }
  };

  const updateTotpSecret = async (newSecret: string) => {
    try {
      await SecureTokenStorage.setTotpSecret(newSecret);
      setTotpAccount((prev) => ({ ...prev, secret: newSecret }));
      return true;
    } catch {
      return false;
    }
  };

  const clearStepUpChallenge = () => {
    setStepUpChallenge(null);
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        user,
        accessToken,
        elevatedToken,
        stepUpChallenge,
        isAirplaneMode,
        totpAccount,
        vaultData,
        lastError,
        networkLogs,
        startOAuthLogin,
        handleOAuthCallback,
        logout,
        refreshSession,
        fetchVaultData,
        submitStepUp2FA,
        updateTotpSecret,
        setAirplaneMode: setIsAirplaneMode,
        clearStepUpChallenge,
        addNetworkLog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
};
