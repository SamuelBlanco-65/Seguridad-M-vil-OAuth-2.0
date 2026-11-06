import React from "react";
import { Activity, Shield, RefreshCw, Trash2, ArrowUpRight, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const NetworkInspector: React.FC = () => {
  const { networkLogs } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <Activity className="w-4 h-4" />
            <span>Consola de Tráfico de Red & Silent Refresh Queue</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registro en vivo de peticiones HTTP, validaciones criptográficas y cola de promesas 401.
          </p>
        </div>
      </div>

      {/* Explicación de la Silent Refresh Queue (Punto 2 del Laboratorio) */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
        <h3 className="font-bold text-white flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>Funcionamiento del Pipeline &quot;Silent Refresh Queue&quot;</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] pt-1">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-cyan-400 font-bold block mb-0.5">1. Intercepción 401</span>
            <span className="text-slate-400">Pausa peticiones entrantes y las encola en un arreglo de promesas.</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-amber-400 font-bold block mb-0.5">2. Mutex Único</span>
            <span className="text-slate-400">Dispara una única solicitud: POST /auth/refresh con el refresh_token.</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-emerald-400 font-bold block mb-0.5">3. Actualización RAM</span>
            <span className="text-slate-400">Actualiza access_token volátil en memoria sin tocar disco.</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-indigo-400 font-bold block mb-0.5">4. Reintento & Flush</span>
            <span className="text-slate-400">Reejecuta todas las peticiones encoladas y libera la cola sin desloguear.</span>
          </div>
        </div>
      </div>

      {/* Live Request Stream */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
          <span>Peticiones Registradas ({networkLogs.length})</span>
        </div>

        {networkLogs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
            Interactúa con la aplicación móvil en la pestaña izquierda para observar el tráfico en tiempo real.
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {networkLogs.map((log) => {
              const isSuccess = log.status >= 200 && log.status < 300;
              const isRedirect = log.status >= 300 && log.status < 400;
              const isForbidden = log.status === 403;
              const isConflict = log.status === 409;
              const isUnauthorized = log.status === 401;

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.method === "POST"
                            ? "bg-blue-500/20 text-blue-300"
                            : log.method === "GET"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {log.method}
                      </span>
                      <span className="text-slate-200 font-bold">{log.url}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuccess
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isRedirect
                            ? "bg-cyan-500/20 text-cyan-400"
                            : isForbidden
                            ? "bg-amber-500/20 text-amber-400"
                            : isConflict
                            ? "bg-red-500/20 text-red-400"
                            : isUnauthorized
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        HTTP {log.status}
                      </span>
                      <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans">{log.details}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
