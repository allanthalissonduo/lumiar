"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  BookOpen,
  Wrench,
  Sparkles,
  Target,
  Save,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ---- Panel definitions ----

type PanelId = "prompt" | "knowledge" | "tools" | "skills" | "objectives";

const PANELS: { id: PanelId; label: string; icon: typeof MessageSquare; description: string }[] = [
  {
    id: "prompt",
    label: "Prompt",
    icon: MessageSquare,
    description: "Persona, tom de voz e instruções do agente.",
  },
  {
    id: "knowledge",
    label: "Base de Conhecimento",
    icon: BookOpen,
    description: "Documentos e FAQs que o agente pode consultar (RAG).",
  },
  {
    id: "tools",
    label: "Ferramentas",
    icon: Wrench,
    description: "Integrações VTEX, webhooks e APIs externas.",
  },
  {
    id: "skills",
    label: "Skills",
    icon: Sparkles,
    description: "Capacidades compostas: buscar pedido, processar devolução…",
  },
  {
    id: "objectives",
    label: "Objetivos",
    icon: Target,
    description: "Metas mensuráveis e critérios de sucesso do agente.",
  },
];

export default function AgentEditorPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const [activePanel, setActivePanel] = useState<PanelId>("prompt");
  const [agentName, setAgentName] = useState(isNew ? "" : "Assistente de Vendas");

  const panel = PANELS.find((p) => p.id === activePanel)!;

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          backgroundColor: "var(--ei-surface-card)",
          borderBottom: "1px solid rgba(159,176,201,0.18)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--ei-text-soft)" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Nome do agente"
            className="bg-transparent text-base font-semibold outline-none"
            style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--ei-cobalt)", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <Save className="h-4 w-4" />
          Salvar
        </button>
      </div>

      {/* Body — sidebar tabs + panel content */}
      <div className="flex min-h-0 flex-1">
        {/* Left tab rail */}
        <nav
          className="flex w-56 shrink-0 flex-col gap-0.5 px-3 py-4"
          style={{
            backgroundColor: "var(--ei-surface-card)",
            borderRight: "1px solid rgba(159,176,201,0.18)",
          }}
        >
          {PANELS.map((p) => {
            const Icon = p.icon;
            const active = p.id === activePanel;
            return (
              <button
                key={p.id}
                onClick={() => setActivePanel(p.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                style={{
                  backgroundColor: active ? "rgba(43,111,219,0.12)" : "transparent",
                  borderLeft: active ? "2px solid var(--ei-cobalt)" : "2px solid transparent",
                  color: active ? "var(--ei-cobalt)" : "var(--ei-text-soft)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{p.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Panel content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mb-6">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {panel.label}
            </h2>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {panel.description}
            </p>
          </div>

          {activePanel === "prompt" && <PromptPanel />}
          {activePanel === "knowledge" && <KnowledgePanel />}
          {activePanel === "tools" && <ToolsPanel />}
          {activePanel === "skills" && <SkillsPanel />}
          {activePanel === "objectives" && <ObjectivesPanel />}
        </main>
      </div>
    </div>
  );
}

// ---- Panel components ----

function PromptPanel() {
  const [systemPrompt, setSystemPrompt] = useState(
    "Você é um assistente de vendas da loja. Responda de forma amigável e objetiva.\n\nSempre:\n- Confirme o nome do cliente\n- Apresente produtos relevantes\n- Ofereça ajuda com dúvidas sobre entrega e devolução"
  );
  const [tone, setTone] = useState<"formal" | "amigável" | "técnico">("amigável");

  return (
    <div className="space-y-6 max-w-2xl">
      <Field label="Tom de voz">
        <div className="flex gap-2">
          {(["formal", "amigável", "técnico"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors capitalize"
              style={{
                backgroundColor: tone === t ? "var(--ei-cobalt)" : "rgba(159,176,201,0.08)",
                color: tone === t ? "#fff" : "var(--ei-text-soft)",
                border: `1px solid ${tone === t ? "transparent" : "rgba(159,176,201,0.18)"}`,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Prompt do sistema">
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={12}
          className="w-full resize-none rounded-xl p-4 text-sm outline-none transition-colors"
          style={{
            backgroundColor: "rgba(159,176,201,0.06)",
            border: "1px solid rgba(159,176,201,0.18)",
            color: "var(--ei-offwhite)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          placeholder="Descreva a persona, instruções e restrições do agente…"
        />
      </Field>

      <Field label="Modelo">
        <select
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: "rgba(159,176,201,0.06)",
            border: "1px solid rgba(159,176,201,0.18)",
            color: "var(--ei-offwhite)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          defaultValue="claude-sonnet-4-6"
        >
          <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
          <option value="claude-opus-4-8">Claude Opus 4.8</option>
        </select>
      </Field>
    </div>
  );
}

function KnowledgePanel() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div
        className="rounded-xl border-2 border-dashed p-8 text-center"
        style={{ borderColor: "rgba(159,176,201,0.22)" }}
      >
        <BookOpen className="mx-auto h-8 w-8" style={{ color: "var(--ei-text-soft)" }} />
        <p className="mt-3 text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Arraste documentos ou clique para fazer upload
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          PDF, DOCX, TXT — máx. 10 MB por arquivo
        </p>
        <button
          className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: "rgba(43,111,219,0.12)", color: "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Escolher arquivos
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
        Os documentos são vetorizados com pgvector e consultados via RAG a cada mensagem.
      </p>
    </div>
  );
}

const VTEX_TOOLS = [
  { id: "vtex-order", name: "Consultar Pedido", description: "Busca status e detalhes de um pedido pelo ID.", enabled: true },
  { id: "vtex-catalog", name: "Buscar Produto", description: "Retorna nome, preço e disponibilidade de produtos.", enabled: true },
  { id: "vtex-cart", name: "Criar Carrinho", description: "Cria um carrinho e retorna link de checkout.", enabled: false },
  { id: "webhook", name: "Webhook Customizado", description: "Chama uma URL externa com payload JSON.", enabled: false },
];

function ToolsPanel() {
  const [tools, setTools] = useState(VTEX_TOOLS);

  return (
    <div className="space-y-3 max-w-2xl">
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="flex items-start justify-between rounded-xl p-4"
          style={{
            backgroundColor: "rgba(159,176,201,0.04)",
            border: "1px solid rgba(159,176,201,0.18)",
          }}
        >
          <div className="min-w-0 flex-1 mr-4">
            <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {tool.name}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {tool.description}
            </p>
          </div>
          <button
            onClick={() => setTools((prev) => prev.map((t) => t.id === tool.id ? { ...t, enabled: !t.enabled } : t))}
            className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
            style={{ backgroundColor: tool.enabled ? "var(--ei-cobalt)" : "rgba(159,176,201,0.20)" }}
            role="switch"
            aria-checked={tool.enabled}
          >
            <span
              className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
              style={{
                backgroundColor: "#fff",
                transform: tool.enabled ? "translateX(18px)" : "translateX(2px)",
              }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

const SKILL_TEMPLATES = [
  { id: "order-status", name: "Status de Pedido", description: "Pede o número do pedido, consulta VTEX e informa o status." },
  { id: "return-request", name: "Solicitar Devolução", description: "Coleta motivo e item, abre chamado de devolução na VTEX." },
  { id: "product-rec", name: "Recomendação de Produto", description: "Entende a necessidade e sugere 3 produtos do catálogo." },
  { id: "escalate", name: "Escalar para Humano", description: "Detecta frustração e transfere para agente humano." },
];

function SkillsPanel() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(["order-status", "escalate"]));

  return (
    <div className="space-y-3 max-w-2xl">
      {SKILL_TEMPLATES.map((skill) => {
        const on = enabled.has(skill.id);
        return (
          <div
            key={skill.id}
            className="flex items-start justify-between rounded-xl p-4 transition-colors"
            style={{
              backgroundColor: on ? "rgba(43,111,219,0.06)" : "rgba(159,176,201,0.04)",
              border: `1px solid ${on ? "rgba(43,111,219,0.30)" : "rgba(159,176,201,0.18)"}`,
            }}
          >
            <div className="min-w-0 flex-1 mr-4">
              <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {skill.name}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {skill.description}
              </p>
            </div>
            <button
              onClick={() => setEnabled((prev) => { const next = new Set(prev); on ? next.delete(skill.id) : next.add(skill.id); return next; })}
              className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
              style={{ backgroundColor: on ? "var(--ei-cobalt)" : "rgba(159,176,201,0.20)" }}
              role="switch"
              aria-checked={on}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                style={{ backgroundColor: "#fff", transform: on ? "translateX(18px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ObjectivesPanel() {
  const [objectives, setObjectives] = useState([
    { id: "1", text: "Taxa de resolução sem humano ≥ 70%", metric: "resolution_rate", target: 70 },
    { id: "2", text: "Tempo médio de resposta ≤ 10s", metric: "avg_response_ms", target: 10000 },
  ]);

  return (
    <div className="space-y-4 max-w-2xl">
      {objectives.map((obj) => (
        <div
          key={obj.id}
          className="flex items-center gap-4 rounded-xl p-4"
          style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.18)" }}
        >
          <Target className="h-5 w-5 shrink-0" style={{ color: "var(--ei-iris)" }} />
          <p className="flex-1 text-sm" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {obj.text}
          </p>
        </div>
      ))}
      <button
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: "rgba(43,111,219,0.10)", color: "var(--ei-cobalt)", border: "1px dashed rgba(43,111,219,0.30)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        + Adicionar objetivo
      </button>
    </div>
  );
}

// ---- Shared helpers ----

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="mb-2 block text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
