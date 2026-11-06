export type AuthState =
  | "INITIALIZING"
  | "UNAUTHENTICATED"
  | "AUTHENTICATING"
  | "AUTHENTICATED"
  | "REFRESHING"
  | "SESSION_EXPIRED"
  | "ERROR";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  mfa_verified?: boolean;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface TotpAccount {
  issuer: string;
  account: string;
  secret: string; // Base32
  digits: number;
  period: number;
  algorithm: string;
}

export interface TotpResult {
  code: string;
  counter: number;
  remainingSeconds: number;
  progressPercent: number;
}

export interface StepUpChallenge {
  error: string;
  message: string;
  step_up_token: string;
  step_up_expires_in: number;
}

export interface ElevatedTokenResponse {
  success: boolean;
  message: string;
  elevated_token: string;
  token_type: string;
  expires_in: number;
  mfa_verified: boolean;
  validated_counter: number;
}

export interface VaultSecretData {
  vault_id: string;
  clearance: string;
  account_balance: string;
  active_crypto_keys: Array<{ alias: string; fingerprint: string }>;
  access_logs_retention_days: number;
  session_elevated_until?: number;
}

export type ActiveTab = "emulator" | "tests" | "crypto_math" | "traffic" | "codebase";
export type MobileScreen = "welcome" | "dashboard" | "authenticator" | "vault" | "security";
