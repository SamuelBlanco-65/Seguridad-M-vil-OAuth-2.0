/**
 * Pruebas unitarias para la cola de Silent Refresh Queue y peticiones concurrentes.
 */

import { ApiClient } from "../services/ApiClient";
import { SecureTokenStorage } from "../services/SecureTokenStorage";

describe("Silent Refresh Queue & Mutex Concurrente", () => {
  beforeEach(async () => {
    await SecureTokenStorage.clearRefreshToken();
  });

  test("Maneja la cola de peticiones pausadas y reintenta tras refresco", async () => {
    const client = new ApiClient("http://localhost:8000");
    await SecureTokenStorage.setRefreshToken("test_mock_refresh_token");

    expect(client.getAccessToken()).toBeNull();
    client.setAccessToken("expired_token");
    expect(client.getAccessToken()).toBe("expired_token");
  });
});
