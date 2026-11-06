# Aplicación Móvil de Seguridad (React Native / Expo SDK 58)
## Taller: Seguridad Móvil — OAuth 2.0 PKCE, Almacenamiento Criptográfico y Step-Up 2FA (TOTP)
### Universidad de La Sabana — Facultad de Ingeniería

Esta aplicación móvil implementa los 4 componentes de seguridad requeridos por la Guía de Laboratorio (Sesión 14):
1. **OAuth 2.0 con PKCE (RFC 7636)** mediante navegador nativo seguro (`expo-web-browser`) y Deep Linking (`unisabana-auth://callback`).
2. **Separación Estricta de Memoria**: `access_token` volátil en RAM y `refresh_token` en hardware enclave (`expo-secure-store`), con **Silent Refresh Queue**.
3. **Módulo Authenticator Zero-Black-Box (RFC 6238)**: Algoritmo TOTP de 6 dígitos con HMAC-SHA1 y Dynamic Truncation implementados desde cero, con soporte offline para **Modo Avión** y paridad con Google Authenticator.
4. **Step-Up Authentication y Bóveda Crítica**: Captura de `403 Forbidden` (`mfa_required`), elevación dinámica mediante `elevated_token` y validación de protección Anti-Replay.

---

### 1. Requisitos e Instalación

- Node.js 20+ y npm/bun
- Expo CLI (`npx expo`)
- Dispositivo Android físico con Expo Go o emulador de Android Studio / simulador de iOS

Instalar dependencias:
```bash
npm install
# o con expo:
npx expo install
```

Verificar compatibilidad:
```bash
npx expo-doctor
```

---

### 2. Configuración de Entorno

Crear archivo `.env`:
```env
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000
```
> **Nota para Android**: Si ejecutas el backend en la misma máquina y pruebas en el **Emulador de Android**, utiliza `http://10.0.2.2:8000`. Si pruebas en un **teléfono Android físico**, utiliza la IP local de tu computadora en la red Wi-Fi (ejemplo: `http://192.168.1.50:8000`).

---

### 3. Ejecución de la App

Iniciar el servidor de desarrollo de Expo:
```bash
npx expo start
```

- Presiona `a` para abrir en el emulador de Android.
- Presiona `i` para abrir en el simulador de iOS.
- O escanea el código QR desde la app móvil Expo Go.

---

### 4. Ejecución de Pruebas Automatizadas

```bash
npm test
```
Ejecuta la suite de pruebas unitarias criptográficas (`totp.test.ts`, `pkce.test.ts`, `silentRefresh.test.ts`).

---

### 5. Estructura de Código

- `src/services/PkceService.ts`: Generador criptográfico de `code_verifier` y `code_challenge`.
- `src/services/Base32Decoder.ts`: Decodificador Base32 RFC 4648 sin dependencias externas.
- `src/services/TotpService.ts`: Motor TOTP RFC 6238 con buffer Big-Endian de 64 bits, HMAC-SHA1 y Dynamic Truncation.
- `src/services/SecureTokenStorage.ts`: Persistencia en hardware enclave (Keychain / Keystore).
- `src/services/ApiClient.ts`: Interceptor HTTP y cola de refresco silencioso.
- `src/context/AuthContext.tsx`: Gestión de estado de sesión, tokens volátiles y elevación 2FA.
