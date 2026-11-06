import React from "react";
import { Shield, KeyRound, Lock, Smartphone, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface WelcomeScreenProps {
  onStartLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartLogin }) => {
  const { authState } = useAuth();

  return (
    <div className="flex flex-col h-full justify-between p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100">
      {/* Top Header */}
      <div className="pt-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/5">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Seguridad Móvil
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Universidad de La Sabana · Sesión 14
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="space-y-3 my-6">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200">OAuth 2.0 con PKCE (RFC 7636)</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Navegador nativo del sistema sin WebViews embebidas. Protección contra ataques de intercepción.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200">Separación de Memoria & Hardware Enclave</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                access_token volátil en RAM (5m); refresh_token en Keychain/Keystore con Silent Refresh Queue.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200">Zero-Black-Box TOTP (RFC 6238)</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cálculo HMAC-SHA1 propio con soporte 100% offline (Modo Avión) y paridad con Google Authenticator.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pb-4">
        <button
          onClick={onStartLogin}
          disabled={authState === "AUTHENTICATING"}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          <span>Iniciar Sesión Segura (OAuth + PKCE)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-center text-slate-500 mt-2.5">
          Public Client · No se expone client_secret en la app
        </p>
      </div>
    </div>
  );
};
