import React, { useState, useEffect } from "react";
import { ArrowLeft, Copy, Check, Plane, QrCode, Key, RefreshCw, Smartphone, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { TotpService } from "../../services/TotpService";
import { Base32Decoder } from "../../services/Base32Decoder";
import { TotpResult } from "../../types";

interface AuthenticatorScreenProps {
  onBack: () => void;
}

export const AuthenticatorScreen: React.FC<AuthenticatorScreenProps> = ({ onBack }) => {
  const { totpAccount, updateTotpSecret, isAirplaneMode, setAirplaneMode, addNetworkLog } = useAuth();
  const [totpData, setTotpData] = useState<TotpResult>({
    code: "000000",
    counter: 0,
    remainingSeconds: 30,
    progressPercent: 100,
  });

  const [copied, setCopied] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [manualSeed, setManualSeed] = useState(totpAccount.secret);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Reloj en tiempo real: cálculo matemático de TOTP según el reloj del sistema (RFC 6238)
  useEffect(() => {
    const tick = () => {
      try {
        const result = TotpService.computeCurrent(totpAccount.secret, 30, 6);
        setTotpData(result);
      } catch (err: any) {
        console.error("Error computing TOTP:", err);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [totpAccount.secret]);

  const handleCopy = () => {
    navigator.clipboard.writeText(totpData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSeed = async () => {
    const cleaned = manualSeed.trim().toUpperCase().replace(/[\s\-_=]/g, "");
    if (!Base32Decoder.isValid(cleaned)) {
      setSeedError("Semilla Base32 inválida. Debe contener solo caracteres [A-Z, 2-7].");
      return;
    }
    setSeedError(null);
    await updateTotpSecret(cleaned);
    setShowSeedModal(false);
    addNetworkLog("LOCAL", "TotpSecretUpdated", 200, `Semilla actualizada en hardware enclave: ${cleaned}`);
  };

  // SVGs para círculo de progreso
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (totpData.progressPercent / 100) * circumference;

  return (
    <div className="flex flex-col h-full justify-between p-4 bg-slate-950 text-slate-100 overflow-y-auto">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-900">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          {/* Airplane Mode Toggle (Prueba de Aceptación 3) */}
          <button
            onClick={() => {
              const newState = !isAirplaneMode;
              setAirplaneMode(newState);
              addNetworkLog(
                "SYSTEM",
                "AirplaneModeToggle",
                200,
                newState ? "Modo Avión ACTIVADO. 0 peticiones de red." : "Modo Avión DESACTIVADO."
              );
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              isAirplaneMode
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
            title="Activar o desactivar modo avión para verificar cálculo offline"
          >
            <Plane className="w-3.5 h-3.5" />
            <span>{isAirplaneMode ? "Modo Avión ACTIVO" : "Modo Avión"}</span>
          </button>
        </div>

        {/* Account Info */}
        <div className="text-center pt-5 pb-3">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            {totpAccount.issuer}
          </div>
          <div className="text-sm font-medium text-slate-200 mt-0.5">
            {totpAccount.account}
          </div>
        </div>

        {/* Large Monospace TOTP Display (Punto 3 del enunciado) */}
        <div className="my-3 p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-slate-800 text-center relative overflow-hidden shadow-xl">
          {/* Circular Countdown Progress */}
          <div className="flex items-center justify-center mb-3">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-slate-800 fill-none"
                  strokeWidth="5"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className={`fill-none transition-all duration-1000 ${
                    totpData.remainingSeconds <= 5
                      ? "stroke-red-500"
                      : totpData.remainingSeconds <= 10
                      ? "stroke-amber-400"
                      : "stroke-cyan-400"
                  }`}
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute font-mono text-base font-bold text-slate-200">
                {totpData.remainingSeconds}s
              </span>
            </div>
          </div>

          {/* 6-digit code formatted as XXX XXX */}
          <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-widest text-cyan-400 tabular-nums select-all">
            {totpData.code.substring(0, 3)} {totpData.code.substring(3, 6)}
          </div>

          {/* Copy Button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copiado al portapapeles</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>

          {/* Offline verification badge */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cálculo matemático local · Cero librerías externas</span>
          </div>
        </div>

        {/* Seed Info & Configuration Options */}
        <div className="space-y-2 mt-4">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Semilla Base32 Registrada</div>
              <div className="font-mono text-xs text-amber-300 font-bold truncate mt-0.5">
                {totpAccount.secret}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => setShowSeedModal(true)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-200 font-medium flex items-center gap-1 cursor-pointer"
                title="Editar semilla Base32 manualmente"
              >
                <Key className="w-3 h-3 text-cyan-400" />
                <span>Semilla</span>
              </button>
              <button
                onClick={() => setShowQrModal(true)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-200 font-medium flex items-center gap-1 cursor-pointer"
                title="Escanear o ver código QR compatible con Google Authenticator"
              >
                <QrCode className="w-3 h-3 text-emerald-400" />
                <span>QR</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Paridad Total con Google Authenticator</span>
            </div>
            <p>
              Agrega la semilla <strong className="font-mono text-slate-200">{totpAccount.secret}</strong> en Google Authenticator oficial para comprobar paridad exacta de dígitos simultáneos (Prueba de Aceptación 2).
            </p>
          </div>
        </div>
      </div>

      {/* Manual Seed Modal */}
      {showSeedModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Configurar Semilla Base32</h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Ingresa manualmente la clave secreta Base32 (RFC 4648) sin dependencias.
            </p>

            <input
              type="text"
              value={manualSeed}
              onChange={(e) => setManualSeed(e.target.value.toUpperCase())}
              placeholder="JBSWY3DPEHPK3PXP"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-amber-300 focus:outline-none focus:border-cyan-500 mb-2 uppercase"
            />

            {seedError && (
              <p className="text-[10px] text-red-400 mb-2">{seedError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSeedModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSeed}
                className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950"
              >
                Guardar en Enclave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code / URI Modal */}
      {showQrModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-center">
            <h3 className="text-sm font-bold text-white mb-1">URI Oficial otpauth://</h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Compatible con Google Authenticator, Microsoft Authenticator y 1Password.
            </p>

            {/* QR Visual Generator */}
            <div className="w-44 h-44 mx-auto bg-white p-3 rounded-xl flex items-center justify-center my-2 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `otpauth://totp/${totpAccount.issuer}:${totpAccount.account}?secret=${totpAccount.secret}&issuer=${totpAccount.issuer}&algorithm=SHA1&digits=6&period=30`
                )}`}
                alt="Código QR TOTP"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[9px] text-slate-400 break-all text-left my-2">
              otpauth://totp/{totpAccount.issuer}:{totpAccount.account}?secret={totpAccount.secret}&issuer={totpAccount.issuer}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
