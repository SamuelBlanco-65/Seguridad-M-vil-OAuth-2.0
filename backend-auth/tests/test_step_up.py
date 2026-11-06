"""Pruebas de integración para Step-Up Authentication y Bóveda Crítica."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.security.tokens import create_access_token, create_elevated_token
from app.security.totp import calculate_totp_at_timestamp
from app.security.anti_replay import anti_replay_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_cache():
    anti_replay_service.clear()

def test_boveda_critica_rejects_standard_access_token():
    # Token con mfa_verified: False
    token = create_access_token("usr_01", "test@unisabana.edu.co", "Estudiante Test")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/boveda-critica", headers=headers)
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["error"] == "mfa_required"
    assert "step_up_token" in data["detail"]

def test_step_up_flow_and_anti_replay():
    # 1. Petición inicial a Bóveda
    token = create_access_token(settings.DEMO_USER_ID, settings.DEMO_USER_EMAIL, settings.DEMO_USER_NAME)
    resp1 = client.get("/api/boveda-critica", headers={"Authorization": f"Bearer {token}"})
    assert resp1.status_code == 403
    step_up_token = resp1.json()["detail"]["step_up_token"]

    # 2. Generar código TOTP válido actual
    code, _, _ = calculate_totp_at_timestamp(settings.DEFAULT_DEMO_SEED)

    # 3. Enviar a /auth/mfa/verify
    verify_resp = client.post("/auth/mfa/verify", json={
        "step_up_token": step_up_token,
        "code": code
    })
    assert verify_resp.status_code == 200
    elevated_token = verify_resp.json()["elevated_token"]

    # 4. Probar acceso exitoso a la bóveda con el elevated_token
    vault_resp = client.get("/api/boveda-critica", headers={"Authorization": f"Bearer {elevated_token}"})
    assert vault_resp.status_code == 200
    assert vault_resp.json()["status"] == "authorized"
    assert vault_resp.json()["security_level"] == "ELEVATED_MFA_ACTIVE"

    # 5. ATAQUE DE REPETICIÓN: Enviar nuevamente el mismo código con un nuevo step_up_token
    resp_again = client.get("/api/boveda-critica", headers={"Authorization": f"Bearer {token}"})
    new_step_up = resp_again.json()["detail"]["step_up_token"]

    replay_resp = client.post("/auth/mfa/verify", json={
        "step_up_token": new_step_up,
        "code": code
    })
    # Debe ser rechazado con 409 Conflict
    assert replay_resp.status_code == 409
    assert "Replay Attack Detected" in replay_resp.json()["detail"]
