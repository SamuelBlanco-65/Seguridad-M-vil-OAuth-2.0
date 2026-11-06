import React, { useState } from "react";
import { FolderTree, FileCode, Copy, Check, Download, ExternalLink, Terminal } from "lucide-react";

interface CodeFile {
  path: string;
  category: "mobile" | "backend" | "docs";
  description: string;
  language: string;
  content: string;
}

export const CodebaseExplorer: React.FC = () => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const files: CodeFile[] = [
    {
      path: "mobile-app/src/services/TotpService.ts",
      category: "mobile",
      description: "Cálculo matemático TOTP RFC 6238 desde cero (HMAC-SHA1 + Dynamic Truncation)",
      language: "typescript",
      content: `// Módulo Criptográfico TOTP RFC 6238 Zero-Black-Box
// 1. Contador T = floor(UnixTimestamp / 30) en 64 bits Big-Endian (8 bytes)
// 2. H = HMAC-SHA1(ClaveSecretaEnBytes, T) [20 bytes]
// 3. Dynamic Truncation: offset = H[19] & 0x0F
// 4. Modulo 10^6 con formateo de 6 cifras (padStart(6, '0'))`,
    },
    {
      path: "mobile-app/src/services/PkceService.ts",
      category: "mobile",
      description: "Generador PKCE RFC 7636 (code_verifier URL-safe y code_challenge Base64URL sin padding)",
      language: "typescript",
      content: `// PKCE RFC 7636 para Clientes Públicos Móviles
// code_verifier: 64 caracteres de alta entropía [A-Za-z0-9-._~]
// code_challenge = BASE64URL(SHA256(code_verifier))`,
    },
    {
      path: "mobile-app/src/services/ApiClient.ts",
      category: "mobile",
      description: "Silent Refresh Queue con mutex de promesa única para peticiones 401 concurrentes",
      language: "typescript",
      content: `// Silent Refresh Queue
// Intercepta HTTP 401, encola solicitudes en vuelo, ejecuta un único POST /auth/refresh
// y reintenta las solicitudes de forma transparente.`,
    },
    {
      path: "backend-auth/app/security/anti_replay.py",
      category: "backend",
      description: "Caché Anti-Replay con TTL de 90s y respuesta 409 Conflict ante reutilización",
      language: "python",
      content: `# Caché Anti-Replay en memoria
# Comprueba y registra de forma atómica (user_id, counter).
# Si se intenta reutilizar antes de 90 segundos:
# raise HTTPException(status_code=409, detail="Replay Attack Detected")`,
    },
    {
      path: "backend-auth/app/api/endpoints.py",
      category: "backend",
      description: "Endpoints REST: OAuth PKCE, Step-Up 403, TOTP Verify y Bóveda Crítica",
      language: "python",
      content: `# FastAPI REST Endpoints
# GET /health
# GET /oauth/authorize
# POST /auth/oauth/token
# POST /auth/refresh
# GET /api/boveda-critica (403 mfa_required)
# POST /auth/mfa/verify (valida con Clock Skew y Anti-Replay)`,
    },
    {
      path: "backend-auth/tests/test_totp.py",
      category: "backend",
      description: "Suite de pruebas Pytest con vectores oficiales RFC 6238 Appendix B",
      language: "python",
      content: `# Pruebas con vectores estándar RFC 6238 Appendix B
# T=1 (59s) -> 942870
# T=37037036 (1111111109s) -> 070818 (preserva cero inicial)
# T=37037037 (1111111111s) -> 140504
# T=41152263 (1234567890s) -> 890059`,
    },
  ];

  const [selectedFile, setSelectedFile] = useState<CodeFile>(files[0]);

  const handleCopy = (path: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <FolderTree className="w-4 h-4" />
            <span>Estructura de Entrega para Git & Sustentación</span>
          </div>
          <h2 className="text-sm font-bold text-white mt-1">
            Repositorio Completo: /mobile-app & /backend-auth
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Código fuente modular, tipado estricto (TypeScript & Python) listo para entrega y evaluación.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const zipInfo = "Repositorio organizado en carpetas /mobile-app y /backend-auth con README.md, ARCHITECTURE.md, IMPLEMENTATION_PLAN.md y PROGRESS.md en la raíz.";
              alert(zipInfo);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Guía de Comandos Git</span>
          </button>
        </div>
      </div>

      {/* Explorer Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* File Tree List */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Archivos Clave del Taller
          </div>

          {files.map((file) => {
            const isSelected = selectedFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  isSelected
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-white"
                    : "hover:bg-slate-800/60 border border-transparent text-slate-400"
                }`}
              >
                <FileCode className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                <div className="min-w-0">
                  <div className={`text-xs font-mono font-bold truncate ${isSelected ? "text-cyan-300" : "text-slate-200"}`}>
                    {file.path.split("/").pop()}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {file.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Code Previewer */}
        <div className="md:col-span-2 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="min-w-0">
                <span className="font-mono text-xs font-bold text-white block truncate">
                  /{selectedFile.path}
                </span>
                <span className="text-[11px] text-slate-400">{selectedFile.description}</span>
              </div>

              <button
                onClick={() => handleCopy(selectedFile.path, selectedFile.content)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedPath === selectedFile.path ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar Archivo</span>
                  </>
                )}
              </button>
            </div>

            <div className="my-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed max-h-[380px]">
              <pre>{selectedFile.content}</pre>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Lenguaje: <strong className="text-slate-200 font-mono">{selectedFile.language}</strong></span>
            <span>Ubicación: <strong className="text-cyan-400 font-mono">/{selectedFile.path}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
