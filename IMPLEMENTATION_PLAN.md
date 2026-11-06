# Plan de Implementación (Fases 1 a 8)
## Taller: Seguridad Móvil — OAuth 2.0 PKCE, Almacenamiento Criptográfico y Step-Up 2FA (TOTP)
### Universidad de La Sabana — Desarrollo de Aplicaciones Móviles

---

### FASE 1: Análisis, Arquitectura y Contratos de Dominio
- [x] Especificación de arquitectura y modelo de amenazas en `ARCHITECTURE.md`.
- [x] Contratos de endpoints REST y parámetros criptográficos.
- [x] Plan de verificación para las 5 Pruebas de Aceptación obligatorias.

### FASE 2: Backend Completo (FastAPI Python + Paridad Node.js Live Server)
- [ ] Implementar `backend-auth/app/security/pkce.py` (validación de RFC 7636).
- [ ] Implementar `backend-auth/app/security/totp.py` (HMAC-SHA1 puro, ventanas de tiempo $C-1, C, C+1$).
- [ ] Implementar `backend-auth/app/security/anti_replay.py` (caché en memoria con atomic check-and-set y TTL de 90s).
- [ ] Implementar `backend-auth/app/security/tokens.py` (JWT para access, refresh, step_up y elevated tokens).
- [ ] Implementar `backend-auth/app/api/endpoints.py` y `backend-auth/app/main.py`.
- [ ] Implementar suite de pruebas Pytest (`tests/test_pkce.py`, `tests/test_totp.py`, `tests/test_anti_replay.py`, `tests/test_step_up.py`).
- [ ] Implementar servidor Express en vivo (`server.ts`) para alimentar la aplicación en el dev server de AI Studio con paridad exacta.

### FASE 3: Módulo Criptográfico Frontend Zero-Black-Box
- [ ] `Base32Decoder.ts`: Decodificador RFC 4648 sin dependencias de alto nivel.
- [ ] `TotpService.ts`: Implementación completa de RFC 6238 con buffer Big-Endian de 64 bits, HMAC-SHA1 y Dynamic Truncation.
- [ ] `PkceService.ts`: Generación criptosegura de `code_verifier` y `code_challenge` en Base64URL sin relleno.
- [ ] Suite de pruebas unitarias criptográficas con vectores RFC 6238 y paridad con Google Authenticator.

### FASE 4: Almacenamiento Seguro y Pipeline de Red con Silent Refresh Queue
- [ ] `SecureTokenStorage.ts`: Abstracción de hardware enclave para `refresh_token` (Keychain / Keystore).
- [ ] `ApiClient.ts`: Wrapper HTTP con cola de promesas para 401, mutex para renovación atómica y reintento automático.
- [ ] `AuthContext.tsx`: Separación estricta de `access_token` en memoria RAM volátil y `refresh_token` en SecureStore.

### FASE 5: Componentes Móviles y Flujo de Navegación
- [ ] Pantalla de Bienvenida (Welcome Screen) con indicadores de seguridad.
- [ ] Pantalla de Login / OAuth 2.0 con simulador de `ASWebAuthenticationSession` / `Custom Tabs` y validación de Deep Link `unisabana-auth://callback` + state anti-CSRF.
- [ ] Dashboard Principal con estado de sesión, claims y accesos directos.
- [ ] Authenticator Screen con display monoespaciado, temporizador visual SVG regresivo de 30s, ingreso manual de semilla Base32, soporte QR y modo avión offline.
- [ ] Bóveda Crítica Screen con captura de 403 Forbidden (`mfa_required`), trigger de Step-Up, elevated_token e inspección de datos confidenciales.
- [ ] Modal de Verificación 2FA con teclado numérico optimizado y envío de `step_up_token` + TOTP.

### FASE 6: Suite Interactiva de las 5 Pruebas de Aceptación
- [ ] Runner automatizado e interactivo para las 5 pruebas de sustentación con logs forenses paso a paso:
  - Prueba 1: Flujo OAuth + PKCE con Navegador del Sistema.
  - Prueba 2: Paridad Estándar TOTP con Google Authenticator.
  - Prueba 3: Cálculo Offline en Modo Avión.
  - Prueba 4: Step-Up Authentication & Bóveda Crítica.
  - Prueba 5: Ataque de Repetición Anti-Replay (409 Conflict).

### FASE 7: Explorador de Código y Exportación de Repositorio Git
- [ ] Explorador de archivos para `/mobile-app` y `/backend-auth`.
- [ ] Descarga o copia limpia de todos los archivos para entrega en Git.
- [ ] Documentación detallada en `README.md` (root, mobile y backend).

### FASE 8: Verificación, Compilación y Auditoría Final
- [ ] Ejecución de `compile_applet` y `lint_applet`.
- [ ] Verificación de paridad contra la rúbrica de calificación (Sobresaliente 4.5 - 5.0).
