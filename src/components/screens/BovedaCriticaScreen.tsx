import React, { useState } from "react";
import { ArrowLeft, Lock, Unlock, ShieldAlert, Key, Database, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface BovedaCriticaScreenProps {
  onBack: () => void;
  onRequestStepUp: () => void;
}

export const BovedaCriticaScreen: React.FC<BovedaCriticaScreenProps> = ({ onBack, onRequestStepUp }) => {
  const { vaultData, elevatedToken, fetchVaultData, addNetworkLog } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleRequestAccess = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      const result = await fetchVaultData();
      if (result.mfaRequired) {
        onRequestStepUp();
      }
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full justify-between p-4 bg-slate-950 text-slate-100 overflow-y-auto">
      <div>
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-900">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Panel</span>
          </button>
          <div className="text-[11px] font-medium text-slate-400">
            Recurso Protegido: <span className="font-mono text-cyan-400">/api/boveda-critica</span>
          </div>
        </div>

        {/* Restricted State (Sin elevación previa) */}
        {!elevatedToken || !vaultData ? (
          <div className="my-6 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/5">
              <Lock className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Bóveda Crítica Universitaria</h2>
              <p className="text-xs text-amber-300/90 font-medium mt-1">
                Step-Up Authentication Requerida
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-2">
                El acceso ordinario con <strong className="text-slate-200">access_token</strong> es insuficiente (<span className="font-mono text-slate-300">mfa_verified: false</span>). El backend devolverá <strong className="text-red-400">403 Forbidden</strong> y exigirá un segundo factor TOTP (RFC 6238).
              </p>
            </div>

            {localError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-left text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{localError}</span>
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={handleRequestAccess}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Consultando Recurso Protegido...</span>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Intentar Acceso a la Bóveda</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-500 mt-2">
                Dispara solicitud HTTP real: GET /api/boveda-critica
              </p>
            </div>
          </div>
        ) : (
          /* Elevated Authorized State (mfa_verified: true) */
          <div className="my-3 space-y-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Privilegios Elevados Activos</h3>
                  <p className="text-[11px] text-emerald-300/80">
                    Claim validado: <span className="font-mono text-emerald-400 font-bold">mfa_verified: true</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Confidential Vault Data */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[11px] text-slate-400">Identificador de Bóveda:</span>
                <span className="font-mono text-xs font-bold text-cyan-400">{vaultData.vault_id}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[11px] text-slate-400">Nivel de Seguridad:</span>
                <span className="text-xs font-semibold text-emerald-400">{vaultData.clearance}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[11px] text-slate-400">Fondos Protegidos:</span>
                <span className="font-mono text-sm font-bold text-white">{vaultData.account_balance}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">Llaves Maestras en HSM:</span>
                <div className="space-y-1.5">
                  {vaultData.active_crypto_keys?.map((k, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-[10px] flex justify-between items-center">
                      <span className="text-slate-300 font-medium">{k.alias}</span>
                      <span className="font-mono text-slate-500">{k.fingerprint}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>Prueba de Aceptación 4 · Step-Up Authentication y Bóveda Crítica</span>
      </div>
    </div>
  );
};
