"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Trash2,
} from "lucide-react";
import { SettingsPanelHead } from "./settings-panel-head";

const OPENROUTER_MODELS = [
  { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5 — rápido e econômico" },
  { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6 — balanceado (recomendado)" },
  { value: "anthropic/claude-opus-4-8", label: "Claude Opus 4.8 — máximo desempenho" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini — econômico" },
  { value: "openai/gpt-4o", label: "GPT-4o — alto desempenho" },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5 — Google" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B — open-source" },
];

type Status = "idle" | "loading" | "saving" | "testing" | "removing";
type Source = "db" | "env" | null;

const fieldStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  borderRadius: "10px",
  padding: "8px 12px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.04)",
  border: "1px solid rgba(159,176,201,0.16)",
  borderRadius: "12px",
  padding: "20px",
};

export function AiSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [model, setModel] = useState("anthropic/claude-haiku-4-5");

  // New-key form
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/account/ai-config");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHasKey(data.has_key);
      setMaskedKey(data.masked_key);
      setSource(data.source);
      setModel(data.model ?? "anthropic/claude-haiku-4-5");
    } catch {
      toast.error("Erro ao carregar configurações de IA");
    } finally {
      setStatus("idle");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    if (!newKey.trim() && !model) return;
    if (newKey && !newKey.startsWith("sk-or-")) {
      toast.error("A chave deve começar com sk-or-");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/account/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey || undefined, model }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Erro ao salvar" }));
        toast.error(error ?? "Erro ao salvar");
        return;
      }
      toast.success("Configuração salva!");
      setNewKey("");
      setTestResult(null);
      await load();
    } finally {
      setStatus("idle");
    }
  }

  async function handleTest() {
    const keyToTest = newKey || (hasKey && source !== "env" ? undefined : undefined);
    setStatus("testing");
    setTestResult(null);
    try {
      // Send a minimal chat request to validate the key
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          system_prompt: "Respond with exactly: OK",
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (res.ok) {
        setTestResult("ok");
        toast.success("Conexão com OpenRouter OK!");
      } else {
        setTestResult("fail");
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Falha na conexão");
      }
    } catch {
      setTestResult("fail");
      toast.error("Erro de rede ao testar");
    } finally {
      setStatus("idle");
    }
  }

  async function handleRemove() {
    if (!confirm("Remover a chave OpenRouter? Os agentes deixarão de funcionar.")) return;
    setStatus("removing");
    try {
      await fetch("/api/account/ai-config", { method: "DELETE" });
      setHasKey(false);
      setMaskedKey(null);
      setSource(null);
      setNewKey("");
      setTestResult(null);
      toast.success("Chave removida");
    } finally {
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Integrações IA"
        description="Conecte o OpenRouter para habilitar os agentes de IA e a sugestão de respostas no inbox."
      />

      {/* Status card */}
      {status === "loading" ? (
        <div className="flex items-center gap-2" style={{ color: "var(--ei-text-soft)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Carregando…</span>
        </div>
      ) : (
        <div style={cardStyle}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: hasKey ? "rgba(26,184,160,0.14)" : "rgba(159,176,201,0.10)" }}
              >
                <Sparkles className="h-4 w-4" style={{ color: hasKey ? "var(--ei-iris)" : "var(--ei-text-soft)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  OpenRouter
                </p>
                {hasKey ? (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {maskedKey}
                    {source === "env" && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "rgba(43,111,219,0.12)", color: "var(--ei-cobalt)" }}>
                        via env var
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Nenhuma chave configurada
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasKey && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "rgba(26,184,160,0.12)", color: "var(--ei-iris)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--ei-iris)" }} />
                  Ativo
                </span>
              )}
              {hasKey && source !== "env" && (
                <button
                  onClick={() => void handleRemove()}
                  disabled={busy}
                  title="Remover chave"
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-40"
                  style={{ color: "var(--ei-text-soft)" }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form — always shown so user can update key or model */}
      {status !== "loading" && source !== "env" && (
        <div className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Chave de API OpenRouter{hasKey ? " — deixe em branco para manter a atual" : ""}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={newKey}
                onChange={(e) => { setNewKey(e.target.value); setTestResult(null); }}
                placeholder={hasKey ? "sk-or-v1-••••••••••••••••" : "sk-or-v1-..."}
                style={{ ...fieldStyle, paddingRight: "40px" }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--ei-text-soft)" }}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
              style={{ color: "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Obter chave no OpenRouter
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Modelo padrão dos agentes
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={fieldStyle}
            >
              {OPENROUTER_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleSave()}
              disabled={busy || (!newKey && !model)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>

            <button
              onClick={() => void handleTest()}
              disabled={busy || (!hasKey && !newKey)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{
                backgroundColor: "rgba(43,111,219,0.12)",
                color: "var(--ei-cobalt)",
                border: "1px solid rgba(43,111,219,0.25)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {status === "testing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResult === "ok" ? (
                <CheckCircle2 className="h-4 w-4" style={{ color: "var(--ei-iris)" }} />
              ) : testResult === "fail" ? (
                <XCircle className="h-4 w-4 text-red-400" />
              ) : null}
              Testar conexão
            </button>
          </div>
        </div>
      )}

      {/* Env var notice */}
      {source === "env" && (
        <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          A chave está definida via variável de ambiente{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>OPENROUTER_API_KEY</code>.
          Para gerenciar aqui, remova a variável e configure via interface.
        </p>
      )}

      {/* Info box */}
      <div
        className="rounded-xl p-4 text-xs leading-relaxed"
        style={{ backgroundColor: "rgba(43,111,219,0.06)", border: "1px solid rgba(43,111,219,0.18)", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <strong style={{ color: "var(--ei-offwhite)" }}>Como funciona:</strong> A chave é armazenada criptografada (AES-256-GCM) e nunca é exposta ao cliente.
        O OpenRouter roteia para Claude, GPT-4o, Gemini e mais de 200 modelos com uma única API. Os custos são cobrados diretamente na sua conta OpenRouter.
      </div>
    </div>
  );
}
