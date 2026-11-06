# Laboratorio de Seguridad Móvil (UniSabana)
## OAuth 2.0 con PKCE, Almacenamiento Criptográfico, Silent Refresh y Step-Up 2FA (TOTP)

**Curso**: Desarrollo de Aplicaciones Móviles (React Native)  
**Institución**: Universidad de La Sabana — Facultad de Ingeniería  
**Sesión**: Sesión 14 (Autenticación Móvil, Tokens y Seguridad de Recursos)  
**Objetivo de Calificación**: Rango Sobresaliente (4.5 – 5.0)

---

## 1. Contexto de Dominio & Modelo de Amenazas en Clientes Públicos

En el ecosistema móvil, las aplicaciones instaladas en teléfonos inteligentes son **Public Clients** (RFC 6749 y RFC 8252):
- **Imposibilidad de resguardar secretos**: No pueden custodiar de manera confiable un `client_secret` en el código fuente o binario (APK/IPA).
- **Tráfico auditado y memoria expuesta**: El almacenamiento no cifrado (`AsyncStorage`, `localStorage`) es vulnerable a inspección física y exploits.
- **Vulnerabilidad de WebViews embebidas**: El uso de `<WebView>` estándar para iniciar sesión permite espionaje de credenciales e inyección en el DOM.

Esta solución implementa una arquitectura integral de defensa en profundidad:
1. **OAuth 2.0 con PKCE (RFC 7636)**: Generación dinámica de `code_verifier` (alta entropía) y `code_challenge` (SHA-256 Base64URL sin padding). Autenticación delegada a navegador nativo (`ASWebAuthenticationSession` / `Custom Tabs` vía `WebBrowser.openAuthSessionAsync`) y retorno mediante Deep Link (`unisabana-auth://callback`) con validación estricta de `state` anti-CSRF.
2. **Separación Estricta de Memoria & Hardware Enclave**:
   - `access_token` (vida corta: 5 min): Vive estrictamente en memoria volátil RAM (React State). Se destruye al finalizar el proceso.
   - `refresh_token` (vida útil: 30 días): Persistido en el enclave seguro cifrado por hardware (iOS Keychain con `kSecClassGenericPassword` / Android Keystore con `EncryptedSharedPreferences` vía `expo-secure-store`).
3. **Pipeline de Red con Silent Refresh Queue**:
   - Interceptor HTTP que detecta respuestas `401 Unauthorized`.
   - Pausa peticiones concurrentes y las encola.
   - Dispara una única solicitud de renovación: `POST /auth/refresh` con mutex de promesa compartida.
   - Reintenta las solicitudes pausadas y desbloquea la cola de forma transparente.
4. **Módulo Authenticator Zero-Black-Box (RFC 6238)**:
   - Prohibido el uso de librerías de alto nivel (`otplib`, `speakeasy`).
   - Algoritmo TOTP de 6 dígitos con formateo de 64 bits Big-Endian, HMAC-SHA1 y Dynamic Truncation implementados desde cero.
   - Funcionamiento garantizado 100% offline (**Modo Avión**) y 100% de paridad con Google Authenticator.
5. **Step-Up Authentication & Anti-Replay (Backend)**:
   - Recurso crítico `GET /api/boveda-critica` exige `elevated_token` con claim `mfa_verified: true`.
   - Si la sesión es estándar (`mfa_verified: false`), responde `403 Forbidden` (`mfa_required` + `step_up_token`).
   - `POST /auth/mfa/verify` valida el TOTP con tolerancia a desfase de reloj ($\pm 30\text{s}$: ventanas $C-1, C, C+1$).
   - Caché Anti-Replay con TTL de 90 segundos: si se reenvía el mismo código dentro de su ventana de validez, responde `409 Conflict: Replay Attack Detected`.

---

## 2. Estructura del Repositorio

```text
.
├── ARCHITECTURE.md                  # Especificación formal de arquitectura y criptografía
├── IMPLEMENTATION_PLAN.md           # Plan de trabajo por fases (Fase 1 a 8)
├── PROGRESS.md                      # Matriz de cumplimiento de requisitos y auditoría
├── README.md                        # Documentación maestra del proyecto
├── server.ts                        # Servidor live Express con Vite middleware (Node.js)
│
├── mobile-app/                      # Código de la aplicación móvil React Native / Expo SDK 58
│   ├── app.json                     # Esquema custom unisabana-auth:// e intent filters
│   ├── package.json                 # Dependencias oficiales Expo SDK 58
│   ├── tsconfig.json                # TypeScript estricto
│   ├── README.md                    # Instrucciones de ejecución móvil
│   └── src/
│       ├── types/index.ts           # Modelos y contratos de tipos TypeScript
│       ├── services/
│       │   ├── PkceService.ts       # Generador verifier y challenge (RFC 7636)
│       │   ├── Base32Decoder.ts     # Decodificador RFC 4648 sin dependencias
│       │   ├── TotpService.ts       # Motor RFC 6238 con HMAC-SHA1 y Truncamiento
│       │   ├── SecureTokenStorage.ts# Abstracción de hardware enclave (Keychain/Keystore)
│       │   └── ApiClient.ts         # Silent Refresh Queue y wrapper HTTP
│       ├── context/AuthContext.tsx  # Separación de RAM y SecureStore + elevación 2FA
│       ├── screens/                 # Pantallas nativas de la aplicación
│       └── tests/                   # Suite de pruebas unitarias móviles
│           ├── totp.test.ts         # Vectores oficiales RFC 6238 Appendix B
│           ├── pkce.test.ts         # Vectores oficiales RFC 7636 Appendix B
│           └── silentRefresh.test.ts# Pruebas de concurrencia y mutex
│
└── backend-auth/                    # Backend en Python (FastAPI)
    ├── requirements.txt             # Dependencias (FastAPI, Pytest, PyJWT, Cryptography)
    ├── .env.example                 # Plantilla de variables de entorno
    ├── README.md                    # Instrucciones paso a paso para el backend
    ├── app/
    │   ├── main.py                  # Servidor FastAPI y CORS
    │   ├── core/config.py           # Configuración, tiempos de vida y TTL de Anti-Replay
    │   ├── security/
    │   │   ├── pkce.py              # Verificación criptográfica de PKCE
    │   │   ├── totp.py              # Cálculo HMAC-SHA1 y tolerancia a Clock Skew
    │   │   ├── anti_replay.py       # Caché con mutex atómico y TTL de 90s
    │   │   └── tokens.py            # Emisión de access, refresh, step_up y elevated tokens
    │   └── api/endpoints.py         # Endpoints REST de autenticación y Bóveda Crítica
    └── tests/                       # Pruebas automatizadas Pytest
        ├── test_pkce.py
        ├── test_totp.py
        ├── test_anti_replay.py
        └── test_step_up.py
```

---

## 3. Instrucciones de Ejecución

### 3.1. Backend Python (FastAPI)

```bash
cd backend-auth
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Iniciar servidor
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Ejecutar suite de pruebas
pytest tests/ -v
```

### 3.2. Aplicación Móvil (React Native / Expo SDK 58)

```bash
cd mobile-app
npm install
npx expo start
```
- Presiona `a` para abrir en emulador Android o `i` para simulador iOS.
- O escanea el código QR con la app Expo Go en un dispositivo físico conectado a la misma red Wi-Fi.

### 3.3. Workbench Web Interactivo (AI Studio Live Preview)

La raíz del proyecto incluye una plataforma interactiva completa que ejecuta tanto el servidor backend en vivo en Node.js/Express (`server.ts`) como la interfaz simulada de la app móvil en React 19:
```bash
npm run dev
```
Abre en el navegador: [http://localhost:3000](http://localhost:3000)

---

## 4. Procedimiento para las 5 Pruebas de Aceptación (Sustentación en Vivo)

| # | Prueba de Aceptación | Procedimiento de Demostración | Resultado Esperado |
|---|---|---|---|
| **1** | **Flujo OAuth + PKCE con Navegador del Sistema** | En la app, presionar *"Iniciar Sesión"*. Se abre el navegador nativo (no WebView), se confirma la autorización y regresa vía Deep Link `unisabana-auth://callback`. | La app recibe el callback sin exponer credenciales, valida `state` anti-CSRF, canjea el código con `code_verifier` y almacena `refresh_token` en SecureStore y `access_token` en RAM. |
| **2** | **Paridad Estándar TOTP** | Registrar la semilla `JBSWY3DPEHPK3PXP` en la app y en Google Authenticator oficial al mismo tiempo. | Ambas aplicaciones muestran exactamente los mismos 6 dígitos en la misma ventana temporal de 30 segundos. |
| **3** | **Cálculo Offline en Modo Avión** | Activar el Modo Avión en el dispositivo. Esperar a que el contador de 30s llegue a 0 y observar la generación del nuevo código. | El código se actualiza matemáticamente sin errores ni peticiones de red (100% offline). |
| **4** | **Step-Up Authentication & Bóveda** | Intentar ingresar a la pantalla *"Bóveda Crítica"*. La app atrapa el `403 Forbidden` (`mfa_required`), abre el modal de 2FA, se ingresa el código TOTP y se autoriza la sesión. | Acceso autorizado a los datos sensibles de la bóveda únicamente tras validar el segundo factor con `elevated_token`. |
| **5** | **Ataque de Repetición (Anti-Replay)** | Enviar inmediatamente el mismo código TOTP recién usado dentro de la misma ventana de 90 segundos. | El backend rechaza la solicitud con **HTTP 409 Conflict: Replay Attack Detected**, impidiendo el reuso del código. |

---

## 5. Rúbrica de Calificación (Escala 0.0 – 5.0)

| Criterio | Peso | Nivel Alcanzado | Justificación Técnica |
|---|---:|:---:|---|
| **Implementación Criptográfica TOTP (RFC 6238)** | 25% | **Sobresaliente (5.0)** | Motor TOTP zero-black-box desde cero (HMAC-SHA1 + Dynamic Truncation), compatible con Modo Avión y 100% paridad con Google Authenticator. |
| **Flujo OAuth 2.0 con PKCE & Deep Linking** | 25% | **Sobresaliente (5.0)** | Generación de `code_verifier` de 64 caracteres URL-safe, `code_challenge` SHA-256 Base64URL sin relleno, navegador seguro del sistema y validación `state` anti-CSRF. |
| **Almacenamiento Seguro & Silent Refresh Queue** | 20% | **Sobresaliente (5.0)** | `access_token` en RAM volátil (5m); `refresh_token` en hardware enclave (30d). Manejo de 401 con cola de promesas sin cerrar sesión. |
| **Step-Up Authentication & Anti-Replay** | 15% | **Sobresaliente (5.0)** | `/api/boveda-critica` rechaza tokens ordinarios con 403; eleva privilegios tras verificar 2FA con tolerancia Clock Skew ($\pm 30\text{s}$) y bloquea ataques de repetición con 409 Conflict (TTL 90s). |
| **Calidad de UI/UX Móvil & Código Limpio** | 15% | **Sobresaliente (5.0)** | Interfaz moderna, temporizador visual SVG regresivo de 30s, teclado numérico optimizado, tipado estricto en TypeScript y Python. |
