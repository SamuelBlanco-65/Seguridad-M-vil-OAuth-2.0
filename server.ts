import express, { Request, Response } from "express";
import crypto from "crypto";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Constantes y almacenes de memoria para el laboratorio académico
const JWT_SECRET = "unisabana_dev_secret_key_change_in_production_9f83a21b";
const DEMO_USER_ID = "usr_unisabana_01";
const DEMO_USER_EMAIL = "estudiante@unisabana.edu.co";
const DEMO_USER_NAME = "Estudiante Sabana";
const DEFAULT_DEMO_SEED = "JBSWY3DPEHPK3PXP";

const AUTHORIZATION_CODES = new Map<string, any>();
const REVOKED_REFRESH_TOKENS = new Set<string>();
const USER_MFA_SEEDS = new Map<string, string>([[DEMO_USER_ID, DEFAULT_DEMO_SEED]]);

// Caché Anti-Replay con TTL de 90 segundos
const antiReplayCache = new Map<string, number>();

function cleanupAntiReplay() {
  const now = Date.now();
  for (const [key, timestamp] of antiReplayCache.entries()) {
    if (now - timestamp > 90000) {
      antiReplayCache.delete(key);
    }
  }
}

// Generación de JWT simple usando Node.js crypto (HMAC-SHA256)
function signJwt(payload: any, expiresInSeconds: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${b64Header}.${b64Payload}`)
    .digest("base64url");

  return `${b64Header}.${b64Payload}.${signature}`;
}

function verifyJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [b64Header, b64Payload, signature] = parts;

    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${b64Header}.${b64Payload}`)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expirado
    }
    return payload;
  } catch {
    return null;
  }
}

// Helpers criptográficos para Base32 y TOTP en el backend
function decodeBase32(base32String: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32String.toUpperCase().replace(/[\s\-_=]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned[i]);
    if (val === -1) throw new Error("Invalid Base32");
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function calculateTotp(secretBase32: string, counter: number): string {
  const secretBytes = decodeBase32(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  counterBuffer.writeUInt32BE(high, 0);
  counterBuffer.writeUInt32BE(low, 4);

  const hmac = crypto.createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = hmac[19] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const totp = binCode % 1000000;
  return totp.toString().padStart(6, "0");
}

function verifyTotpWithSkew(secretBase32: string, userCode: string, period = 30): { valid: boolean; counter?: number } {
  const currentCounter = Math.floor(Date.now() / 1000 / period);
  const candidates = [currentCounter, currentCounter - 1, currentCounter + 1];

  for (const c of candidates) {
    const expected = calculateTotp(secretBase32, c);
    if (expected === userCode.trim()) {
      return { valid: true, counter: c };
    }
  }
  return { valid: false };
}

// Middleware de autenticación Bearer
function requireAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Token de autorización faltante o inválido" });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ detail: "Token expirado o firma criptográfica inválida" });
  }
  (req as any).user = payload;
  next();
}

// ----------------- RUTAS DEL BACKEND REST -----------------

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: Math.floor(Date.now() / 1000),
    service: "UniSabana Mobile Security Backend (Live Server)",
    anti_replay_ttl: 90,
    totp_period: 30,
  });
});

app.get("/oauth/authorize", (req, res) => {
  const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query as any;

  if (code_challenge_method !== "S256") {
    return res.status(400).json({ detail: "Solo se admite code_challenge_method=S256" });
  }

  const authCode = `auth_code_${crypto.randomBytes(8).toString("hex")}`;
  AUTHORIZATION_CODES.set(authCode, {
    code_challenge,
    client_id,
    redirect_uri,
    state,
    created_at: Date.now(),
    user_id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    name: DEMO_USER_NAME,
    used: false,
  });

  const callbackUrl = `${redirect_uri}?code=${authCode}&state=${state}`;
  res.redirect(callbackUrl);
});

app.post("/auth/oauth/token", (req, res) => {
  const { code, code_verifier } = req.body;
  const record = AUTHORIZATION_CODES.get(code);

  if (!record) {
    return res.status(400).json({ detail: "Código de autorización inválido" });
  }
  if (record.used) {
    return res.status(400).json({ detail: "Código de autorización ya utilizado" });
  }
  if (Date.now() - record.created_at > 60000) {
    AUTHORIZATION_CODES.delete(code);
    return res.status(400).json({ detail: "Código de autorización expirado" });
  }

  // Validación PKCE: BASE64URL(SHA256(code_verifier)) === code_challenge
  const computedChallenge = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64url");

  if (computedChallenge !== record.code_challenge) {
    return res.status(400).json({ detail: "Fallo PKCE: code_verifier no coincide con code_challenge" });
  }

  record.used = true;

  const accessToken = signJwt(
    { sub: record.user_id, email: record.email, name: record.name, type: "access", mfa_verified: false },
    300 // 5 minutos
  );

  const refreshToken = signJwt(
    { sub: record.user_id, type: "refresh", jti: crypto.randomUUID() },
    30 * 86400 // 30 días
  );

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: 300,
    user: {
      id: record.user_id,
      email: record.email,
      name: record.name,
    },
  });
});

app.post("/auth/refresh", (req, res) => {
  const { refresh_token } = req.body;
  const payload = verifyJwt(refresh_token);

  if (!payload || payload.type !== "refresh") {
    return res.status(401).json({ detail: "Refresh token inválido o expirado" });
  }
  if (REVOKED_REFRESH_TOKENS.has(payload.jti)) {
    return res.status(401).json({ detail: "Refresh token revocado" });
  }

  const newAccessToken = signJwt(
    { sub: payload.sub, email: DEMO_USER_EMAIL, name: DEMO_USER_NAME, type: "access", mfa_verified: false },
    300
  );

  res.json({
    access_token: newAccessToken,
    token_type: "Bearer",
    expires_in: 300,
  });
});

app.post("/auth/logout", (req, res) => {
  const { refresh_token } = req.body;
  const payload = verifyJwt(refresh_token);
  if (payload?.jti) {
    REVOKED_REFRESH_TOKENS.add(payload.jti);
  }
  res.json({ message: "Sesión cerrada y refresh token revocado correctamente" });
});

app.get("/auth/me", requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    id: user.sub,
    email: user.email,
    name: user.name,
    mfa_verified: user.mfa_verified || false,
    token_type: user.type,
    expires_at: user.exp,
  });
});

app.post("/auth/mfa/enroll", requireAuth, (req, res) => {
  const user = (req as any).user;
  const secret = (req.body.secret || DEFAULT_DEMO_SEED).trim().toUpperCase();
  USER_MFA_SEEDS.set(user.sub, secret);

  const issuer = "UniSabana";
  const account = user.email || DEMO_USER_EMAIL;
  const otpauth_uri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  res.json({
    secret,
    issuer,
    account,
    otpauth_uri,
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  });
});

app.get("/api/boveda-critica", requireAuth, (req, res) => {
  const user = (req as any).user;
  const isMfaVerified = user.mfa_verified === true;

  if (!isMfaVerified) {
    const stepUpToken = signJwt({ sub: user.sub, type: "step_up", jti: crypto.randomUUID() }, 300);
    return res.status(403).json({
      detail: {
        error: "mfa_required",
        message: "Step-Up 2FA requerido: este recurso contiene datos críticos y exige elevación de privilegios.",
        step_up_token: stepUpToken,
        step_up_expires_in: 300,
      },
    });
  }

  res.json({
    status: "authorized",
    security_level: "ELEVATED_MFA_ACTIVE",
    data: {
      vault_id: "VAULT-UNISABANA-SEC-2026",
      clearance: "NIVEL_5_CONFIDENCIAL",
      account_balance: "$124,500,000 COP",
      active_crypto_keys: [
        { alias: "Production-Master-Signer", fingerprint: "SHA256:7a9c8b0e1d2f3a4b" },
        { alias: "Database-TDE-Enclave-Key", fingerprint: "SHA256:1e2d3c4b5a6f7e8d" },
      ],
      access_logs_retention_days: 365,
      session_elevated_until: user.exp,
    },
  });
});

app.post("/auth/mfa/verify", (req, res) => {
  const { step_up_token, code } = req.body;
  const stepUpPayload = verifyJwt(step_up_token);

  if (!stepUpPayload || stepUpPayload.type !== "step_up") {
    return res.status(400).json({ detail: "Token de Step-Up inválido o expirado" });
  }

  const userId = stepUpPayload.sub;
  const secret = USER_MFA_SEEDS.get(userId) || DEFAULT_DEMO_SEED;

  // 1. Validación de código TOTP con Clock Skew
  const { valid, counter } = verifyTotpWithSkew(secret, code);
  if (!valid || counter === undefined) {
    return res.status(400).json({ detail: "Código TOTP inválido o fuera de ventana temporal" });
  }

  // 2. Caché Anti-Replay (bloqueo durante 90s)
  cleanupAntiReplay();
  const cacheKey = `${userId}:${counter}`;
  if (antiReplayCache.has(cacheKey)) {
    return res.status(409).json({
      detail: `Replay Attack Detected: Este código TOTP ya fue consumido en la ventana ${counter}. Anti-Replay TTL: 90s.`,
    });
  }
  antiReplayCache.set(cacheKey, Date.now());

  // 3. Emisión de elevated_token (10 minutos con mfa_verified: true)
  const elevatedToken = signJwt(
    { sub: userId, email: DEMO_USER_EMAIL, name: DEMO_USER_NAME, type: "elevated", mfa_verified: true },
    600 // 10 minutos
  );

  res.json({
    success: true,
    message: "Step-Up 2FA verificado con éxito. Privilegios elevados.",
    elevated_token: elevatedToken,
    token_type: "Bearer",
    expires_in: 600,
    mfa_verified: true,
    validated_counter: counter,
  });
});

// Inicializar Vite Dev Server y montarlo en Express
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor UniSabana Activo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
