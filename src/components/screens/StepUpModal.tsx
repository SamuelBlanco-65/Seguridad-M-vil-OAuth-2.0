import React, { useState } from "react";
import { X, ShieldAlert, KeyRound, AlertTriangle, ArrowRight, Sparkles, Delete } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { TotpService } from "../../services/TotpService";

interface StepUpModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const StepUpModal: React.FC<StepUpModalProps> = ({ onClose, onSuccess }) => {
  const { stepUpChallenge, submitStepUp2FA, totpAccount } = useAuth();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReplayError, setIsReplayError] = useState(false);

  const fullCode = digits.join("");

  const handleKeyPress = (digit: string) => {
    setErrorMessage(null);
    setIsReplayError(false);
    const firstEmptyIndex = digits.findIndex((d) => d === "");
    if (firstEmptyIndex !== -1) {
      const next = [...digits];
      next[firstEmptyIndex] = digit;
      setDigits(next);
    }
  };

  const handleBackspace = () => {
    setErrorMessage(null);
    setIsReplayError(false);
    const lastFilledIndex = [...digits].reverse().findIndex((d) => d !== "");
    if (lastFilledIndex !== -1) {
      const realIndex = 5 - lastFilledIndex;
      const next = [...digits];
      next[realIndex] = "";
      setDigits(next);
    }
  };

  const handleClear = () => {
    setDigits(["", "", "", "", "", ""]);
    setErrorMessage(null);
    setIsReplayError(false);
  };

  const handleAutoFillCurrentTotp = () => {
    try {
      const current = TotpService.computeCurrent(totpAccount.secret, 30, 6);
      setDigits(current.code.split(""));
      setErrorMessage(null);
      setIsReplayError(false);
    } catch {
      // Ignorar
    }
  };

  const handleSubmit = async () => {
    if (fullCode.length !== 6) {
      setErrorMessage("Por favor ingresa los 6 dígitos del código TOTP");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setIsReplayError(false);

    const result = await submitStepUp2FA(fullCode);
    setIsVerifying(false);

    if (result.success) {
      onSuccess();
    } else {
      setErrorMessage(result.error || "Código inválido");
      if (result.error && result.error.includes("Replay Attack Detected")) {
        setIsReplayError(true);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 shadow-2xl flex flex-col max-h-[95%] animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Elevación de Privilegios (Step-Up 2FA)</h3>
              <p className="text-[10px] text-slate-400">Punto 4 & 5: RFC 6238 + Anti-Replay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Challenge Explanation */}
        <div className="py-3 text-center">
          <p className="text-xs text-slate-300">
            Ingresa el código TOTP generado por tu Authenticator para autorizar el acceso a la Bóveda Crítica.
          </p>

          {/* 6-Digit Display */}
          <div className="flex justify-center gap-2 my-3">
            {digits.map((digit, idx) => (
              <div
                key={idx}
                className={`w-10 h-12 rounded-xl flex items-center justify-center font-mono text-xl font-bold border transition-all ${
                  digit
                    ? "bg-slate-800 border-cyan-500 text-cyan-300 shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
              >
                {digit || "·"}
              </div>
            ))}
          </div>

          {/* Quick Auto-Fill helper for smooth demo / emulator */}
          <div className="flex justify-center gap-2 mb-2">
            <button
              onClick={handleAutoFillCurrentTotp}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
              title="Pegar automáticamente el código generado en tiempo real por el Authenticator"
            >
              <Sparkles className="w-3 h-3" />
              <span>Pegar código actual ({totpAccount.secret.substring(0, 4)}...)</span>
            </button>
          </div>

          {/* Error Banner / Replay Attack Alert */}
          {errorMessage && (
            <div
              className={`p-3 rounded-xl text-left text-xs mb-3 flex items-start gap-2 ${
                isReplayError
                  ? "bg-red-950/80 border border-red-500 text-red-200"
                  : "bg-red-950/40 border border-red-800 text-red-300"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300">
                  {isReplayError ? "HTTP 409 Conflict: Ataque de Repetición" : "Verificación Fallida"}
                </p>
                <p className="text-[11px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Numeric Keypad (Touch targets >= 44px) */}
        <div className="grid grid-cols-3 gap-2 my-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-cyan-500 active:text-slate-950 text-slate-200 font-bold text-base transition-colors flex items-center justify-center cursor-pointer min-h-[44px]"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-semibold flex items-center justify-center cursor-pointer min-h-[44px]"
          >
            Limpiar
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-cyan-500 active:text-slate-950 text-slate-200 font-bold text-base transition-colors flex items-center justify-center cursor-pointer min-h-[44px]"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer min-h-[44px]"
            title="Borrar dígito"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            disabled={isVerifying || fullCode.length !== 6}
            className="w-full h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {isVerifying ? (
              <span>Validando con Anti-Replay y Clock Skew...</span>
            ) : (
              <>
                <span>Verificar Código y Elevar Sesión</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
