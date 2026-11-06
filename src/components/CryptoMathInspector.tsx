import React, { useState, useEffect } from "react";
import { Cpu, ShieldCheck, Binary, Calculator, Clock, Sparkles } from "lucide-react";
import { TotpService } from "../services/TotpService";
import { Base32Decoder } from "../services/Base32Decoder";

export const CryptoMathInspector: React.FC = () => {
  const [secret, setSecret] = useState("JBSWY3DPEHPK3PXP");
  const [timeOffset, setTimeOffset] = useState(0); // Para probar desfase de reloj C-1, C, C+1
  const [currentTs, setCurrentTs] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTs(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const simulatedTs = currentTs + timeOffset;
  const period = 30;
  const counter = Math.floor(simulatedTs / period);
  const remaining = period - (simulatedTs % period);

  // Paso 1: Big-Endian 64-bit buffer (8 bytes)
  const counterBytes = TotpService.counterToBigEndianBytes(counter);
  const counterHex = Array.from(counterBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");

  // Paso 2: Base32 decoding
  let secretBytes: Uint8Array = new Uint8Array(0);
  let base32Hex = "";
  try {
    secretBytes = Base32Decoder.decode(secret);
    base32Hex = Array.from(secretBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
  } catch {
    base32Hex = "Semilla Base32 Inválida";
  }

  // Paso 3: HMAC-SHA1
  const hmac = TotpService.hmacSha1(secretBytes, counterBytes);
  const hmacHex = Array.from(hmac)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");

  // Paso 4: Truncamiento dinámico
  const offset = hmac[19] & 0x0f;
  const byte0 = hmac[offset];
  const byte1 = hmac[offset + 1];
  const byte2 = hmac[offset + 2];
  const byte3 = hmac[offset + 3];

  const binCode =
    ((byte0 & 0x7f) << 24) |
    ((byte1 & 0xff) << 16) |
    ((byte2 & 0xff) << 8) |
    (byte3 & 0xff);

  const totpCode = (binCode % 1000000).toString().padStart(6, "0");

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          <Calculator className="w-4 h-4" />
          <span>RFC 6238 · Descomposición Matemática Paso a Paso</span>
        </div>
        <p className="text-xs text-slate-300 mt-1">
          Inspección visual del algoritmo TOTP ejecutado en tiempo real sin librerías externas (&quot;Caja Negra&quot;).
        </p>
      </div>

      {/* Controles de Simulación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Semilla Base32 (Clave Secreta)</label>
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-xs text-amber-300 focus:outline-none focus:border-cyan-500 uppercase"
          />
          <p className="text-[10px] text-slate-500">Bytes decodificados: {secretBytes.length} bytes</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-300">Desfase de Reloj (Clock Skew Simulator)</label>
            <span className="font-mono text-xs text-cyan-400 font-bold">{timeOffset}s</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeOffset(-30)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                timeOffset === -30 ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300"
              }`}
            >
              C - 1 (-30s)
            </button>
            <button
              onClick={() => setTimeOffset(0)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                timeOffset === 0 ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300"
              }`}
            >
              C (Actual 0s)
            </button>
            <button
              onClick={() => setTimeOffset(30)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                timeOffset === 30 ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300"
              }`}
            >
              C + 1 (+30s)
            </button>
          </div>
          <p className="text-[10px] text-slate-500">El backend tolera las 3 ventanas temporales C-1, C y C+1</p>
        </div>
      </div>

      {/* 4 Pasos Criptográficos Desglosados */}
      <div className="space-y-4">
        {/* Paso 1 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">1</span>
              <span>Ventana Temporal T (Contador de 64 bits Big-Endian)</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">T = floor(UnixTime / 30)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Timestamp Unix Simulado:</span>
              <span className="text-slate-200">{simulatedTs} ({remaining}s restantes en ventana)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Contador T (Decimal):</span>
              <span className="text-amber-400 font-bold">{counter}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
            <span className="text-slate-500 text-[10px] block">Buffer Big-Endian (8 Bytes Hexadecimal):</span>
            <span className="text-cyan-300 font-bold">{counterHex}</span>
          </div>
        </div>

        {/* Paso 2 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">2</span>
              <span>Hash Criptográfico HMAC-SHA1 (RFC 2104)</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">20 Bytes (160 bits)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
            <span className="text-slate-500 text-[10px] block">Digest H = HMAC-SHA1(K, T):</span>
            <span className="text-emerald-400 break-all">{hmacHex}</span>
          </div>
        </div>

        {/* Paso 3 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">3</span>
              <span>Dynamic Truncation (Truncamiento Dinámico)</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">offset = H[19] & 0x0F</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Último Byte H[19] & 0x0F:</span>
              <span className="text-amber-300">Offset = {offset} (0x{offset.toString(16)})</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">4 Bytes Consecutivos:</span>
              <span className="text-cyan-300">
                0x{byte0.toString(16).padStart(2, "0")} 0x{byte1.toString(16).padStart(2, "0")} 0x{byte2.toString(16).padStart(2, "0")} 0x{byte3.toString(16).padStart(2, "0")}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Máscara 31 bits (& 0x7FFFFFFF):</span>
              <span className="text-emerald-300 font-bold">{binCode}</span>
            </div>
          </div>
        </div>

        {/* Paso 4 */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">4</span>
              <span>Resultado Final: Código de 6 Dígitos</span>
            </span>
            <span className="text-[10px] text-cyan-300 font-mono">TOTP = bin_code % 10^6</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-300">
              Preserva ceros a la izquierda mediante padding:
            </div>
            <div className="font-mono text-3xl font-black text-cyan-400 tracking-widest bg-slate-950 px-4 py-1.5 rounded-xl border border-cyan-500/40">
              {totpCode}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
