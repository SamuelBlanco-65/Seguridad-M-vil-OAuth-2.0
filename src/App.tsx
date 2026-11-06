import React, { useState } from "react";
import { Shield, Smartphone, Award, Calculator, Activity, FolderTree, Play, Lock, RefreshCw, KeyRound, ExternalLink, CheckCircle2 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MobileFrame } from "./components/MobileFrame";
import { WelcomeScreen } from "./components/screens/WelcomeScreen";
import { LoginModal } from "./components/screens/LoginModal";
import { DashboardScreen } from "./components/screens/DashboardScreen";
import { AuthenticatorScreen } from "./components/screens/AuthenticatorScreen";
import { BovedaCriticaScreen } from "./components/screens/BovedaCriticaScreen";
import { StepUpModal } from "./components/screens/StepUpModal";
import { SecurityAuditScreen } from "./components/screens/SecurityAuditScreen";
import { AcceptanceTestRunner } from "./components/AcceptanceTestRunner";
import { CryptoMathInspector } from "./components/CryptoMathInspector";
import { NetworkInspector } from "./components/NetworkInspector";
import { CodebaseExplorer } from "./components/CodebaseExplorer";
import { ActiveTab, MobileScreen } from "./types";

const MainWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("emulator");
  const [currentMobileScreen, setCurrentMobileScreen] = useState<MobileScreen>("welcome");
  const [isSystemBrowserOpen, setIsSystemBrowserOpen] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>("");
  const [isStepUpModalOpen, setIsStepUpModalOpen] = useState(false);

  const {
    authState,
    user,
    accessToken,
    elevatedToken,
    stepUpChallenge,
    isAirplaneMode,
    setAirplaneMode,
    startOAuthLogin,
    handleOAuthCallback,
    refreshSession,
    clearStepUpChallenge,
  } = useAuth();

  // Iniciar flujo OAuth desde la pantalla de bienvenida
  const handleStartOAuth = async () => {
    const res = await startOAuthLogin();
    if (res.success && res.url) {
      setAuthUrl(res.url);
      setIsSystemBrowserOpen(true);
    }
  };

  // Callback de redirección Deep Link
  const handleAuthSuccess = async (callbackUrl: string) => {
    setIsSystemBrowserOpen(false);
    const success = await handleOAuthCallback(callbackUrl);
    if (success) {
      setCurrentMobileScreen("dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar Contract (§2 Constitution: 1-line wordmark, 4-5 nav links, 1 primary CTA) */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
            <Shield className="w-5 h-5 fill-slate-950" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Seguridad Móvil · UniSabana
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab("emulator")}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "emulator"
                ? "bg-slate-800 text-white font-semibold"
                : "hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            Simulador Móvil
          </button>
          <button
            onClick={() => setActiveTab("tests")}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "tests"
                ? "bg-slate-800 text-white font-semibold"
                : "hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            5 Pruebas de Aceptación
          </button>
          <button
            onClick={() => setActiveTab("crypto_math")}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "crypto_math"
                ? "bg-slate-800 text-white font-semibold"
                : "hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            Matemática Criptográfica
          </button>
          <button
            onClick={() => setActiveTab("traffic")}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "traffic"
                ? "bg-slate-800 text-white font-semibold"
                : "hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            Consola de Red
          </button>
          <button
            onClick={() => setActiveTab("codebase")}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "codebase"
                ? "bg-slate-800 text-white font-semibold"
                : "hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            Repositorio Git
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab("tests")}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/15 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Sustentación en Vivo (5 Min)</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "emulator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Mobile Simulator Device */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <MobileFrame>
                {/* Active Screen View */}
                {authState === "UNAUTHENTICATED" || currentMobileScreen === "welcome" ? (
                  <WelcomeScreen onStartLogin={handleStartOAuth} />
                ) : currentMobileScreen === "authenticator" ? (
                  <AuthenticatorScreen onBack={() => setCurrentMobileScreen("dashboard")} />
                ) : currentMobileScreen === "vault" ? (
                  <BovedaCriticaScreen
                    onBack={() => setCurrentMobileScreen("dashboard")}
                    onRequestStepUp={() => setIsStepUpModalOpen(true)}
                  />
                ) : currentMobileScreen === "security" ? (
                  <SecurityAuditScreen onBack={() => setCurrentMobileScreen("dashboard")} />
                ) : (
                  <DashboardScreen
                    onNavigate={(screen) => {
                      if (screen === "welcome") {
                        setCurrentMobileScreen("welcome");
                      } else {
                        setCurrentMobileScreen(screen);
                      }
                    }}
                  />
                )}

                {/* System Web Browser Sheet (OAuth PKCE) */}
                {isSystemBrowserOpen && (
                  <LoginModal
                    authUrl={authUrl}
                    onClose={() => setIsSystemBrowserOpen(false)}
                    onSuccess={handleAuthSuccess}
                  />
                )}

                {/* Step-Up 2FA Modal */}
                {isStepUpModalOpen && (
                  <StepUpModal
                    onClose={() => {
                      setIsStepUpModalOpen(false);
                      clearStepUpChallenge();
                    }}
                    onSuccess={() => {
                      setIsStepUpModalOpen(false);
                      setCurrentMobileScreen("vault");
                    }}
                  />
                )}
              </MobileFrame>

              {/* Sub-controls under mobile simulator */}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <span>Dispositivo: <strong>Android / iOS (Expo SDK 58)</strong></span>
                <span>·</span>
                <span>Deep Link: <code className="text-cyan-400 font-mono">unisabana-auth://</code></span>
              </div>
            </div>

            {/* Right: Real-time Telemetry & Scenario Jump Panel */}
            <div className="lg:col-span-7 space-y-5">
              {/* Telemetry Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white">Telemetría de Sesión & Enclave de Seguridad</h2>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      authState === "AUTHENTICATED"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    ESTADO: {authState}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Usuario</span>
                    <span className="font-semibold text-slate-200 truncate block">
                      {user ? user.email : "Sin autenticar"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">RAM: access_token</span>
                    <span className="font-mono text-cyan-400 font-semibold truncate block">
                      {accessToken ? "Activo (TTL 5m)" : "Inactivo (0)"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Enclave: refresh_token</span>
                    <span className="font-mono text-emerald-400 font-semibold truncate block">
                      {authState === "AUTHENTICATED" ? "Custodiado (30d)" : "Desalojado"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Nivel de Elevación</span>
                    <span className="font-semibold text-amber-300 truncate block">
                      {elevatedToken ? "ELEVADO (mfa=true)" : "ESTÁNDAR (mfa=false)"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Protección Anti-Replay</span>
                    <span className="font-mono text-indigo-400 font-semibold truncate block">
                      TTL 90s (HTTP 409)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Conectividad de Red</span>
                    <span className={`font-semibold truncate block ${isAirplaneMode ? "text-amber-400" : "text-emerald-400"}`}>
                      {isAirplaneMode ? "Modo Avión (Offline)" : "Conectado a Backend"}
                    </span>
                  </div>
                </div>
              </div>

                {/* Quick Demo Navigation for 5-Minute Exam Presentation */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Acceso Rápido a Escenarios de Evaluación (Sustentación)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      if (authState !== "AUTHENTICATED") {
                        handleStartOAuth();
                      } else {
                        setCurrentMobileScreen("dashboard");
                      }
                    }}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>1. Flujo OAuth + PKCE</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dispara el navegador nativo y valida code_verifier y anti-CSRF state.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentMobileScreen("authenticator");
                    }}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>2 & 3. TOTP & Modo Avión</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Verifica paridad con Google Authenticator y cálculo 100% offline.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentMobileScreen("vault");
                    }}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>4. Step-Up 403 & Bóveda</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Atrapa mfa_required, solicita segundo factor y autoriza la bóveda.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentMobileScreen("vault");
                      setIsStepUpModalOpen(true);
                    }}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-red-400 font-semibold text-xs mb-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span>5. Probar Ataque Replay (409)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Reenvía el mismo código TOTP recién validado para ver HTTP 409 Conflict.
                    </p>
                  </button>
                </div>
              </div>

              {/* Silent Refresh Test Button */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Prueba de Silent Refresh Queue</div>
                  <div className="text-[11px] text-slate-400">Canjea refresh_token por nuevo access_token sin cerrar sesión</div>
                </div>
                <button
                  onClick={() => refreshSession()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Renovar Token</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Official Acceptance Tests Runner */}
        {activeTab === "tests" && <AcceptanceTestRunner />}

        {/* Tab 3: Cryptographic Math Inspector */}
        {activeTab === "crypto_math" && <CryptoMathInspector />}

        {/* Tab 4: Network & Silent Queue Inspector */}
        {activeTab === "traffic" && <NetworkInspector />}

        {/* Tab 5: Git Repository & Code Explorer */}
        {activeTab === "codebase" && <CodebaseExplorer />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainWorkbench />
    </AuthProvider>
  );
}
