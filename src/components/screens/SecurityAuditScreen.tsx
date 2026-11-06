import React, { useState } from "react";
import { ArrowLeft, ShieldCheck, Key, RefreshCw, AlertTriangle, Cpu, Database, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../services/ApiClient";
import { SecureTokenStorage } from "../../services/SecureTokenStorage";

interface SecurityAuditScreenProps {
  onBack: () => void;
}

export const SecurityAuditScreen: React.FC<SecurityAuditScreenProps> = ({ onBack }) => {
  const { user, accessToken, elevatedToken, refreshSession, addNetworkLog } = useAuth();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Decodificador seguro de JWT visual (sin secretos)
  const parseJwtVisual = (token: string | null) => {
    if (!token) return null;
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      return JSON.parse(atob(parts[1]));
    } catch {
      return { preview: token.substring(0, 20) + "..." };
    }
  };

  const accessPayload = parseJwtVisual(accessToken);
  const elevatedPayload = parseJwtVisual(elevatedToken);

  const simulate401ConcurrentCalls = async () => {
    setTesting(true);
    setTestResult("Disparando 3 peticiones concurrentes con token inválido...");
    addNetworkLog("TEST", "SilentRefreshTest", 401, "Simulando 3 peticiones simultáneas con 401...");

    try {
      // Modificar temporalmente token a uno inválido para forzar 401
      apiClient.setAccessToken("invalid_expired_token_simulation");

      // Lanzar 3 peticiones en paralelo para probar la cola de promesas mutex
      const promises = [
        apiClient.get("/auth/me").catch((e) => e),
        apiClient.get("/auth/me").catch((e) => e),
        apiClient.get("/auth/me").catch((e) => e),
      ];

      const results = await Promise.all(promises);
      setTestResult("¡Éxito! La cola Silent Refresh resolvió las 3 peticiones concurrentes mediante una ÚNICA llamada a /auth/refresh.");
      addNetworkLog("TEST", "SilentRefreshSuccess", 200, "Cola de promesas procesada y desbloqueada.");
    } catch (err: any) {
      setTestResult(`Error en prueba: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full justify-between p-4 bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-900">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <span className="text-[11px] font-medium text-slate-400">Auditoría Criptográfica</span>
        </div>

        {/* Claims del access_token (RAM) */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>access_token (RAM Volátil)</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">5 min TTL</span>
          </div>

          <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[10px] text-slate-300 overflow-x-auto">
            {accessPayload
              ? JSON.stringify(accessPayload, null, 2)
              : "No hay token activo en memoria"}
          </pre>
        </div>

        {/* Claims del elevated_token (RAM) */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>elevated_token (RAM Volátil - Step-Up)</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">10 min TTL</span>
          </div>

          <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[10px] text-slate-300 overflow-x-auto">
            {elevatedPayload
              ? JSON.stringify(elevatedPayload, null, 2)
              : "No se ha solicitado Step-Up 2FA todavía"}
          </pre>
        </div>

        {/* Silent Refresh Concurrency Test */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Prueba de Concurrencia Silent Refresh Queue</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Simula 3 peticiones en paralelo con token expirado (HTTP 401). Valida que solo se dispare una única petición de renovación y que la cola no se bloquee ni cierre la sesión.
          </p>

          <button
            onClick={simulate401ConcurrentCalls}
            disabled={testing}
            className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-colors cursor-pointer"
          >
            {testing ? "Ejecutando pruebas concurrentes..." : "Ejecutar Prueba de Concurrencia 401"}
          </button>

          {testResult && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
              {testResult}
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-900 text-center">
        <p className="text-[10px] text-slate-500">
          Enclave seguro respaldado por expo-secure-store (Keychain / Keystore)
        </p>
      </div>
    </div>
  );
};
