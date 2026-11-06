import React, { useState } from "react";
import { Globe, Lock, ShieldCheck, X, ExternalLink, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface LoginModalProps {
  authUrl: string;
  onClose: () => void;
  onSuccess: (callbackUrl: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ authUrl, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tamperState, setTamperState] = useState(false);
  const { addNetworkLog } = useAuth();

  const handleAuthorize = async () => {
    setIsSubmitting(true);
    try {
      // Llamar al endpoint del backend /oauth/authorize
      const res = await fetch(authUrl, { redirect: "manual" });
      const callbackUrl = res.url || (authUrl.includes("redirect_uri=") ? "unisabana-auth://callback?code=auth_code_simulated&state=" : "");

      // Si se activó la prueba de manipulación de state anti-CSRF
      let finalCallback = callbackUrl;
      if (tamperState) {
        finalCallback = finalCallback.replace(/state=[^&]+/, "state=tampered_malicious_state_value");
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(finalCallback);
      }, 600);
    } catch {
      // Fallback: construir URL del Deep Link directo con el state original
      const urlObj = new URL("http://dummy" + authUrl);
      const stateParam = tamperState ? "tampered_malicious_csrf_state" : urlObj.searchParams.get("state") || "valid_state";
      const codeParam = `auth_code_${Math.random().toString(36).substring(2, 10)}`;
      const fallbackDeepLink = `unisabana-auth://callback?code=${codeParam}&state=${stateParam}`;

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(fallbackDeepLink);
      }, 500);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
      {/* System Browser Sheet */}
      <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 shadow-2xl flex flex-col max-h-[92%] animate-in slide-in-from-bottom duration-300">
        {/* Browser Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 max-w-[240px] truncate">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">auth.unisabana.edu.co</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            title="Cancelar autenticación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Content */}
        <div className="py-4 space-y-4 overflow-y-auto">
          <div className="text-center pt-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">
              Navegador Seguro del Sistema
            </h2>
            <p className="text-[11px] text-slate-400">
              ASWebAuthenticationSession (iOS) / Custom Tabs (Android)
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span>Cliente Público:</span>
              <span className="font-mono text-cyan-400">unisabana_mobile_client</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Método PKCE:</span>
              <span className="font-mono text-emerald-400">S256 (SHA-256)</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Deep Link Scheme:</span>
              <span className="font-mono text-amber-400">unisabana-auth://callback</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Aislamiento:</span>
              <span className="text-slate-300">Cero acceso a cookies por la app</span>
            </div>
          </div>

          {/* Test CSRF Toggle */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-200">Simular Ataque CSRF (State Inválido)</div>
              <div className="text-[10px] text-slate-400">Modifica el parámetro state para verificar rechazo</div>
            </div>
            <button
              onClick={() => setTamperState(!tamperState)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                tamperState ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {tamperState ? "CSRF Activo" : "Normal"}
            </button>
          </div>

          <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-200 text-xs">
            <p className="font-semibold text-blue-300 mb-1">Identidad Universitaria</p>
            <p className="text-[11px] text-blue-200/80">
              Iniciando sesión como <strong className="text-white">estudiante@unisabana.edu.co</strong> (Estudiante UniSabana).
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={handleAuthorize}
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Redirigiendo a la app mediante Deep Link...</span>
            ) : (
              <>
                <span>Autorizar y Regresar a la App Móvil</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
