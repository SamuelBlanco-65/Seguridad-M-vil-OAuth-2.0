import React from "react";
import { User, ShieldCheck, KeyRound, Lock, Smartphone, ChevronRight, LogOut, RefreshCw, Cpu, Database } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MobileScreen } from "../../types";

interface DashboardScreenProps {
  onNavigate: (screen: MobileScreen) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { user, accessToken, elevatedToken, logout, refreshSession } = useAuth();

  return (
    <div className="flex flex-col h-full justify-between p-4 bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="space-y-4">
        {/* User Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-white truncate">{user?.name || "Estudiante UniSabana"}</h2>
              <p className="text-xs text-slate-400 truncate">{user?.email || "estudiante@unisabana.edu.co"}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-medium text-emerald-400">
                  {elevatedToken ? "Privilegios Elevados (2FA Activo)" : "Sesión Estándar (OAuth PKCE)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Separation Cards (Punto 2 del Laboratorio) */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
            Arquitectura de Memoria
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {/* RAM Volátil */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-medium uppercase">RAM Volátil</span>
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">access_token</div>
                <div className="text-[10px] text-slate-400 mt-0.5">TTL: 5 min · Destruido al matar app</div>
              </div>
              <div className="mt-2 text-[10px] text-cyan-400 font-mono truncate">
                {accessToken ? `${accessToken.substring(0, 16)}...` : "No emitido"}
              </div>
            </div>

            {/* Hardware Enclave */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-medium uppercase">Hardware Enclave</span>
                <Database className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">refresh_token</div>
                <div className="text-[10px] text-slate-400 mt-0.5">TTL: 30 días · Keychain/Keystore</div>
              </div>
              <div className="mt-2 text-[10px] text-emerald-400 font-mono truncate">
                Resguardado en SecureStore
              </div>
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Módulos del Sistema
          </div>

          {/* Authenticator Button */}
          <button
            onClick={() => onNavigate("authenticator")}
            className="w-full p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Authenticator Propio (RFC 6238)
                </div>
                <div className="text-[10px] text-slate-400">
                  TOTP 6 dígitos · Opera en Modo Avión · Cero dependencias
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
          </button>

          {/* Bóveda Crítica Button */}
          <button
            onClick={() => onNavigate("vault")}
            className="w-full p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  Bóveda Crítica (Step-Up 2FA)
                </div>
                <div className="text-[10px] text-slate-400">
                  Recurso protegido · Retorna 403 Forbidden sin elevación
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
          </button>

          {/* Security Details Button */}
          <button
            onClick={() => onNavigate("security")}
            className="w-full p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Auditoría y Silent Refresh
                </div>
                <div className="text-[10px] text-slate-400">
                  Inspeccionar claims JWT y probar interceptor de red
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="pt-4 border-t border-slate-900 flex gap-2">
        <button
          onClick={() => refreshSession()}
          className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
          title="Ejecutar renovación de access_token usando refresh_token de SecureStore"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Silent Refresh</span>
        </button>

        <button
          onClick={logout}
          className="h-10 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-xs flex items-center justify-center gap-1.5 border border-red-500/20 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir</span>
        </button>
      </div>
    </div>
  );
};
