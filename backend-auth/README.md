# Backend de Autenticación y Autorización (FastAPI)
## Taller: Seguridad Móvil — OAuth 2.0 PKCE, Almacenamiento Criptográfico y Step-Up 2FA (TOTP)
### Universidad de La Sabana — Facultad de Ingeniería

Este backend ligero en Python con FastAPI implementa los estándares criptográficos y de autorización requeridos para clientes públicos móviles (RFC 7636, RFC 6238, RFC 6749).

---

### 1. Requisitos e Instalación

1. **Python 3.10 o superior**
2. Crear un entorno virtual:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # o en Windows: venv\Scripts\activate
   ```
3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```

---

### 2. Ejecución del Servidor

Iniciar el servidor con Uvicorn:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Documentación interactiva Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- Especificación OpenAPI Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Endpoint de verificación de estado: [http://localhost:8000/health](http://localhost:8000/health)

---

### 3. Ejecución de Pruebas Automatizadas (Pytest)

Ejecutar la suite completa de pruebas criptográficas y de seguridad:
```bash
pytest tests/ -v
```

Cobertura de pruebas:
- `test_pkce.py`: Verificación de vectores oficiales RFC 7636 Appendix B y validación de `code_verifier`.
- `test_totp.py`: Verificación con vectores oficiales RFC 6238 (tiempos 59s, 1111111109s, etc.) y tolerancia a Clock Skew.
- `test_anti_replay.py`: Detección atómica de reutilización de códigos y expiración de TTL (90s).
- `test_step_up.py`: Flujo completo de elevación de privilegios ante `403 Forbidden` (`mfa_required`) y rechazo con `409 Conflict`.

---

### 4. Tabla de Endpoints REST

| Método | Endpoint | Responsabilidad |
|---|---|---|
| `GET` | `/health` | Estado del backend, timestamp y sincronización horaria |
| `GET` | `/oauth/authorize` | Autorización OAuth en navegador seguro (`openAuthSessionAsync`) |
| `POST` | `/auth/oauth/token` | Canje de `authorization_code` con validación PKCE `SHA256(verifier) == challenge` |
| `POST` | `/auth/refresh` | Renovación silenciosa con `refresh_token` (Silent Refresh) |
| `POST` | `/auth/logout` | Revocación de sesión y token |
| `GET` | `/auth/me` | Información del usuario y nivel de autenticación |
| `POST` | `/auth/mfa/enroll` | Registro de semilla Base32 y URI `otpauth://` |
| `GET` | `/api/boveda-critica` | Recurso protegido. Retorna 403 con `step_up_token` si `mfa_verified: false` |
| `POST` | `/auth/mfa/verify` | Validación TOTP, control Anti-Replay y emisión de `elevated_token` |
