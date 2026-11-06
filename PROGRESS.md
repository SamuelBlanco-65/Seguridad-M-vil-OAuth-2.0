# Registro de Progreso y Auditoría de Cumplimiento (PROGRESS.md)
## Taller: Seguridad Móvil — OAuth 2.0 PKCE, Almacenamiento Criptográfico y Step-Up 2FA (TOTP)
### Universidad de La Sabana — Facultad de Ingeniería

---

### Matriz de Cumplimiento de Requisitos

| Requisito / Escenario | Estado | Justificación y Validación Criptográfica |
| :--- | :---: | :--- |
| **Punto 1: PKCE RFC 7636** | `Completado` | `code_verifier` de 64 caracteres de alta entropía (`[A-Za-z0-9-._~]`); `code_challenge` SHA-256 Base64URL sin relleno; probado contra vector oficial RFC 7636 Appendix B. |
| **Punto 1: Navegador Seguro del Sistema** | `Completado` | Uso de `WebBrowser.openAuthSessionAsync` (ASWebAuthenticationSession / Custom Tabs) con Deep Link `unisabana-auth://callback` y validación estricta de `state` anti-CSRF. |
| **Punto 2: Separación Estricta de Memoria** | `Completado` | `access_token` vive exclusivamente en memoria RAM volátil (TTL 5 min); `refresh_token` se persiste en enclave seguro por hardware (Keychain/Keystore vía `expo-secure-store`, TTL 30 días). |
| **Punto 2: Silent Refresh Queue** | `Completado` | Interceptor HTTP modular que intercepta 401, encola solicitudes en vuelo mediante mutex de promesa compartida, ejecuta `POST /auth/refresh` y reintenta peticiones sin desloguear al usuario. |
| **Punto 3: Módulo TOTP Propio RFC 6238** | `Completado` | Cero librerías de alto nivel (`otplib`, `speakeasy`). Cálculo matemático completo: entero 64-bit Big-Endian, HMAC-SHA1 de 20 bytes y Truncamiento Dinámico (offset `H[19] & 0x0F`). |
| **Punto 3: Funcionamiento Offline (Modo Avión)** | `Completado` | Cálculo local basado exclusivamente en el reloj del sistema operativo Unix. No efectúa peticiones de red para generar los códigos de 6 dígitos. |
| **Punto 3: Paridad con Google Authenticator** | `Completado` | Validado con vectores oficiales RFC 6238 Appendix B (tiempos 59s, 1111111109s, 1111111111s, etc.) y con la semilla estándar `JBSWY3DPEHPK3PXP`. |
| **Punto 4: Step-Up Authentication** | `Completado` | `GET /api/boveda-critica` valida claim `mfa_verified: false` y responde `403 Forbidden` (`mfa_required` + `step_up_token`). `POST /auth/mfa/verify` eleva privilegios y emite `elevated_token` (TTL 10m). |
| **Punto 5: Caché Anti-Replay (90s)** | `Completado` | Backend registra cada código validado para el usuario con TTL de 90s. Si se vuelve a enviar dentro de la ventana, rechaza con `409 Conflict: Replay Attack Detected`. |
| **5 Pruebas de Aceptación (Sustentación)** | `Completado` | Suite interactiva y automatizada con runner ejecutable en la pestaña "5 Pruebas de Aceptación" para sustentación de 5 minutos. |
| **Código Limpio y Repositorios /mobile-app & /backend-auth** | `Completado` | Código fuente completo en TypeScript estricto para React Native / Expo SDK 58 y Python con FastAPI + Pytest para backend. |
