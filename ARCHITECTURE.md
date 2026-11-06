# Arquitectura de Seguridad Móvil (UniSabana — Sesión 14)
## OAuth 2.0 con PKCE, Almacenamiento Criptográfico, Silent Refresh y Step-Up 2FA (TOTP)

### 1. Resumen Ejecutivo y Modelo de Amenazas en Clientes Públicos (Public Clients)

Las aplicaciones móviles instaladas en dispositivos finales (Android / iOS) se clasifican formalmente según la especificación OAuth 2.0 (RFC 6749 y RFC 8252) como **Public Clients**. Por definición:
- No pueden salvaguardar un `client_secret` de manera confidencial, pues el binario (APK, AAB, IPA) puede desensamblarse mediante ingeniería inversa (`apktool`, `jadx`, `ghidra`).
- El tráfico HTTPS puede interceptarse en entornos hostiles o de depuración mediante herramientas Proxy (`Charles`, `mitmproxy`, `Burp Suite`) con instalación de certificados de usuario.
- El almacenamiento volátil y no cifrado (`AsyncStorage`, `SharedPreferences`, `UserDefaults`, `localStorage`) es vulnerable a extracción física, respaldos no cifrados y exploits a nivel de sistema de archivos o root/jailbreak.
- Las `WebViews` embebidas tradicionales (`<WebView>`) representan un vector de riesgo crítico: la aplicación anfitriona puede inyectar JavaScript en el DOM, espiar credenciales y cookies, y carece de aislamiento de sesión con el navegador del sistema operativo.

Para contrarrestar estas vulnerabilidades, este proyecto implementa una **arquitectura de defensa en profundidad**:
1. **OAuth 2.0 Authorization Code con PKCE (RFC 7636)**: Reemplazo del secreto de cliente por un par criptográfico dinámico efímero (`code_verifier` y `code_challenge`), delegando la autenticación a `ASWebAuthenticationSession` (iOS) o `Custom Tabs` (Android) mediante `WebBrowser.openAuthSessionAsync`.
2. **Separación Estricta de Memoria & Hardware Enclave**:
   - `access_token` (vida corta: 5 min): estrictamente en memoria volátil RAM (React State / Service Singleton). Jamás en disco.
   - `refresh_token` (vida extendida: 30 días): resguardado en el enclave seguro nativo de hardware (iOS Keychain con `kSecClassGenericPassword` / Android Keystore con `EncryptedSharedPreferences` vía `expo-secure-store`).
3. **Pipeline de Red con Silent Refresh Queue**: Interceptor HTTP transparente que intercepta códigos `401 Unauthorized`, pausa peticiones concurrentes mediante un mutex de promesa única, renueva el `access_token` sin cerrar la sesión del usuario, reintenta las solicitudes encoladas y libera la cola.
4. **Módulo Authenticator Propio Zero-Black-Box (RFC 6238)**: Algoritmo TOTP de 6 dígitos calculado matemáticamente sin librerías externas (`otplib`, `speakeasy`). Utiliza HMAC-SHA1 y Dynamic Truncation sobre ventanas de 30 segundos, operable al 100% en **Modo Avión** (offline) y con 100% de paridad frente a Google Authenticator.
5. **Step-Up Authentication & Caché Anti-Replay (Backend)**: El recurso crítico (`GET /api/boveda-critica`) exige un `elevated_token` con el claim `mfa_verified: true`. Las peticiones estándar son rechazadas con `403 Forbidden` (`mfa_required` + `step_up_token`). El backend valida el TOTP con tolerancia a reloj de $\pm 30\text{s}$ (ventanas $C-1, C, C+1$) y registra cada código en memoria con TTL de 90 segundos, bloqueando repeticiones con `409 Conflict: Replay Attack Detected`.

---

### 2. Diagrama de Flujo Integral

```text
[ DISPOSITIVO MÓVIL ]                                        [ BACKEND FASTAPI / AUTH SERVER ]
       |                                                                      |
       |--- 1. Genera code_verifier (alta entropía) y code_challenge --------|
       |--- 2. Abre WebBrowser seguro -> GET /oauth/authorize --------------->|
       |       (Muestra pantalla de login segura del sistema)                |
       |<-- 3. Redirección Deep Link: unisabana-auth://callback?code=... -----|
       |--- 4. Valida state anti-CSRF                                         |
       |--- 5. POST /auth/oauth/token (code + code_verifier) ---------------->|
       |       [Backend verifica: SHA256(code_verifier) === code_challenge]   |
       |<-- 6. Responde: access_token (RAM, 5m) + refresh_token (SecureStore)-|
       |                                                                      |
       |=== [ACCESO A RECURSO CRÍTICO SIN ELEVACIÓN] =========================|
       |--- 7. GET /api/boveda-critica (Bearer access_token [mfa=false]) ---->|
       |<-- 8. HTTP 403 Forbidden { error: "mfa_required", step_up_token } ---|
       |                                                                      |
       |=== [CÁLCULO TOTP LOCAL (RFC 6238) - OPERA EN MODO AVIÓN] ============|
       |--- 9. T = floor(UnixTimestamp / 30) en Big-Endian (8 bytes)          |
       |--- 10. H = HMAC-SHA1(SecretBytes, T) [20 bytes]                      |
       |--- 11. Offset = H[19] & 0x0F -> Dynamic Truncation -> 6 dígitos      |
       |                                                                      |
       |=== [STEP-UP ELEVATION & ANTI-REPLAY] =================================|
       |--- 12. POST /auth/mfa/verify { step_up_token, totp_code } ---------->|
       |        [Backend verifica ventanas C-1, C, C+1 y consulta Anti-Replay]|
       |        [Registra en caché con TTL de 90s]                            |
       |<-- 13. Responde: elevated_token (mfa_verified: true, TTL 10m) -------|
       |--- 14. GET /api/boveda-critica (Bearer elevated_token) ------------->|
       |<-- 15. HTTP 200 OK con datos ultra-sensibles de la Bóveda -----------|
       |                                                                      |
       |=== [PRUEBA DE ATAQUE DE REPETICIÓN (REPLAY ATTACK)] =================|
       |--- 16. POST /auth/mfa/verify con el mismo TOTP --------------------->|
       |<-- 17. HTTP 409 Conflict { detail: "Replay Attack Detected" } -------|
       |                                                                      |
       |=== [EXPIRACIÓN DE ACCESS TOKEN & SILENT REFRESH] ====================|
       |--- 18. Petición ordinaria con token expirado -> HTTP 401 ----------->|
       |--- 19. Pausa solicitudes concurrentes en cola (Silent Queue)         |
       |--- 20. Dispara única petición: POST /auth/refresh { refresh_token }->|
       |<-- 21. Emite nuevo access_token en RAM                               |
       |--- 22. Desbloquea y reintenta las peticiones originales encoladas ---|
```

---

### 3. Especificación Criptográfica Detallada

#### 3.1. PKCE (RFC 7636)
- **`code_verifier`**: Generado con `crypto.getRandomValues` (o `Expo Crypto`). Cadena con 64 caracteres de alta entropía seleccionados del conjunto URL-safe `[A-Z, a-z, 0-9, -, ., _, ~]`.
- **`code_challenge`**: Cálculo de hash SHA-256 binario del `code_verifier`, codificado en Base64URL sin relleno (`=`).
  $$\text{code\_challenge} = \text{base64url}(\text{SHA256}(\text{code\_verifier}))$$

#### 3.2. TOTP (RFC 6238)
- **Semilla Base32**: Decodificación RFC 4648 sin padding a array de bytes (`Uint8Array`).
- **Contador Temporal $T$**:
  $$T = \lfloor \frac{\text{UnixTime}}{30} \rfloor$$
  Empaquetado como un entero sin signo de 64 bits en formato Big-Endian (8 bytes).
- **HMAC-SHA1**:
  $$H = \text{HMAC-SHA1}(\text{SecretBytes}, T) \quad (\text{longitud: 20 bytes})$$
- **Truncamiento Dinámico (Dynamic Truncation)**:
  $$\text{offset} = H[19] \ \& \ \text{0x0F}$$
  $$\text{bin\_code} = ((H[\text{offset}] \ \& \ \text{0x7F}) \ll 24) \ | \ ((H[\text{offset}+1] \ \& \ \text{0xFF}) \ll 16) \ | \ ((H[\text{offset}+2] \ \& \ \text{0xFF}) \ll 8) \ | \ (H[\text{offset}+3] \ \& \ \text{0xFF})$$
  $$\text{TOTP} = \text{bin\_code} \pmod{10^6}$$
  Formateado a 6 dígitos con relleno de ceros a la izquierda (`padStart(6, '0')`).

---

### 4. Estructura de Directorios del Repositorio

```text
/
├── ARCHITECTURE.md
├── IMPLEMENTATION_PLAN.md
├── PROGRESS.md
├── README.md
│
├── mobile-app/
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   └── src/
│       ├── types/
│       │   └── index.ts
│       ├── services/
│       │   ├── PkceService.ts
│       │   ├── Base32Decoder.ts
│       │   ├── TotpService.ts
│       │   ├── SecureTokenStorage.ts
│       │   └── ApiClient.ts
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── screens/
│       │   ├── WelcomeScreen.tsx
│       │   ├── LoginScreen.tsx
│       │   ├── DashboardScreen.tsx
│       │   ├── AuthenticatorScreen.tsx
│       │   ├── BovedaCriticaScreen.tsx
│       │   ├── StepUpModal.tsx
│       │   └── SecuritySessionScreen.tsx
│       └── tests/
│           ├── totp.test.ts
│           ├── pkce.test.ts
│           └── silentRefresh.test.ts
│
└── backend-auth/
    ├── requirements.txt
    ├── .env.example
    ├── README.md
    ├── app/
    │   ├── main.py
    │   ├── core/
    │   │   └── config.py
    │   ├── security/
    │   │   ├── pkce.py
    │   │   ├── totp.py
    │   │   ├── anti_replay.py
    │   │   └── tokens.py
    │   └── api/
    │       └── endpoints.py
    └── tests/
        ├── test_pkce.py
        ├── test_totp.py
        ├── test_anti_replay.py
        └── test_step_up.py
```
