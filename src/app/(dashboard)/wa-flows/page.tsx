"use client";

import { useState } from "react";
import {
  Plus,
  Layers,
  Play,
  Copy,
  Trash2,
  MessageSquare,
  GitBranch,
  CheckCircle2,
  Clock,
  ArrowRight,
  Square,
  Diamond,
  X,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type FlowStatus = "draft" | "published" | "paused";

interface WAFlow {
  id: string;
  name: string;
  description: string;
  status: FlowStatus;
  screens: number;
  responses: number;
  updatedAt: string;
}

type ScreenType = "welcome" | "form" | "decision" | "end";

interface FlowScreen {
  id: string;
  type: ScreenType;
  title: string;
  x: number;
  y: number;
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_FLOWS: WAFlow[] = [
  {
    id: "flow-1",
    name: "Qualificação de Lead",
    description: "Coleta nome, e-mail e interesse do cliente antes de conectar com vendas.",
    status: "published",
    screens: 4,
    responses: 312,
    updatedAt: "há 2 dias",
  },
  {
    id: "flow-2",
    name: "Pesquisa de Satisfação",
    description: "NPS pós-compra com 3 perguntas objetivas e campo de comentário livre.",
    status: "published",
    screens: 3,
    responses: 87,
    updatedAt: "há 5 dias",
  },
  {
    id: "flow-3",
    name: "Onboarding Novo Cliente",
    description: "Guia o cliente pelos primeiros passos após a primeira compra.",
    status: "draft",
    screens: 6,
    responses: 0,
    updatedAt: "há 1 hora",
  },
  {
    id: "flow-4",
    name: "Recuperação de Carrinho",
    description: "Flow interativo que mostra os itens abandonados e oferece cupom.",
    status: "paused",
    screens: 3,
    responses: 41,
    updatedAt: "há 8 dias",
  },
];

const SCREEN_TEMPLATES: {
  type: ScreenType;
  label: string;
  icon: typeof MessageSquare;
  desc: string;
}[] = [
  { type: "welcome",  label: "Boas-vindas", icon: MessageSquare, desc: "Tela inicial com texto e CTA" },
  { type: "form",     label: "Formulário",  icon: GitBranch,     desc: "Campos de entrada de dados" },
  { type: "decision", label: "Decisão",     icon: Diamond,       desc: "Bifurcação condicional" },
  { type: "end",      label: "Encerramento",icon: CheckCircle2,  desc: "Tela final com confirmação" },
];

const INITIAL_SCREENS: FlowScreen[] = [
  { id: "s1", type: "welcome",  title: "Boas-vindas",       x: 60,  y: 120 },
  { id: "s2", type: "form",     title: "Dados do cliente",  x: 280, y: 120 },
  { id: "s3", type: "decision", title: "Tem interesse?",    x: 500, y: 120 },
  { id: "s4", type: "end",      title: "Encerrar",          x: 720, y: 120 },
];

// ── Status & screen styling ───────────────────────────────────────────────────

const STATUS: Record<FlowStatus, { bg: string; color: string; dot: string; label: string }> = {
  published: { bg: "rgba(26,184,160,0.10)",  color: "var(--ei-iris)",       dot: "var(--ei-iris)",       label: "Publicado" },
  draft:     { bg: "rgba(159,176,201,0.10)", color: "var(--ei-text-soft)",  dot: "var(--ei-text-soft)",  label: "Rascunho" },
  paused:    { bg: "rgba(234,154,13,0.10)",  color: "#EAA40D",              dot: "#EAA40D",              label: "Pausado" },
};

const SCREEN_STYLE: Record<ScreenType, { bg: string; border: string; icon: string }> = {
  welcome:  { bg: "rgba(43,111,219,0.14)",  border: "rgba(43,111,219,0.40)",  icon: "var(--ei-cobalt)" },
  form:     { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.35)", icon: "#a78bfa" },
  decision: { bg: "rgba(234,154,13,0.10)",  border: "rgba(234,154,13,0.35)", icon: "#EAA40D" },
  end:      { bg: "rgba(26,184,160,0.10)",  border: "rgba(26,184,160,0.30)", icon: "var(--ei-iris)" },
};

// ── Canvas node ───────────────────────────────────────────────────────────────

function ScreenNode({
  screen,
  selected,
  onClick,
}: {
  screen: FlowScreen;
  selected: boolean;
  onClick: () => void;
}) {
  const style = SCREEN_STYLE[screen.type];
  const TypeIcon =
    screen.type === "welcome"  ? MessageSquare :
    screen.type === "form"     ? GitBranch :
    screen.type === "decision" ? Diamond : CheckCircle2;

  return (
    <div
      className="absolute flex flex-col items-center gap-2 cursor-pointer select-none"
      style={{ left: screen.x, top: screen.y }}
      onClick={onClick}
    >
      <div
        className="flex h-16 w-32 flex-col items-center justify-center gap-1 rounded-xl transition-all"
        style={{
          backgroundColor: style.bg,
          border: `2px solid ${selected ? style.border : "rgba(159,176,201,0.18)"}`,
          boxShadow: selected ? `0 0 0 3px ${style.border}22` : "none",
        }}
      >
        <TypeIcon className="h-4 w-4" style={{ color: style.icon }} />
        <span className="text-[10px] font-medium text-center leading-tight px-2" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {screen.title}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
        {screen.type}
      </span>
    </div>
  );
}

// ── SVG connectors ────────────────────────────────────────────────────────────

function Connectors({ screens }: { screens: FlowScreen[] }) {
  if (screens.length < 2) return null;
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
      {screens.slice(0, -1).map((from, i) => {
        const to = screens[i + 1];
        const x1 = from.x + 128;
        const y1 = from.y + 32;
        const x2 = to.x;
        const y2 = to.y + 32;
        const mx = (x1 + x2) / 2;
        return (
          <g key={`${from.id}-${to.id}`}>
            <path
              d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="rgba(43,111,219,0.35)"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            <circle cx={x2} cy={y2} r={4} fill="var(--ei-cobalt)" opacity={0.7} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Flow builder ──────────────────────────────────────────────────────────────

function FlowBuilder({ flow, onClose }: { flow: WAFlow; onClose: () => void }) {
  const [screens, setScreens] = useState<FlowScreen[]>(INITIAL_SCREENS);
  const [selected, setSelected] = useState<string | null>("s1");

  function addScreen(type: ScreenType) {
    const last = screens[screens.length - 1];
    const newScreen: FlowScreen = {
      id: `s${Date.now()}`,
      type,
      title: SCREEN_TEMPLATES.find(t => t.type === type)?.label ?? "Nova tela",
      x: last ? last.x + 220 : 60,
      y: 120,
    };
    setScreens(prev => [...prev, newScreen]);
    setSelected(newScreen.id);
  }

  const selectedScreen = screens.find(s => s.id === selected);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#0A1628" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ backgroundColor: "var(--ei-surface-card)", borderBottom: "1px solid rgba(159,176,201,0.18)" }}
      >
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: "var(--ei-text-soft)" }}>
            <X className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{flow.name}</p>
            <p className="text-[10px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{screens.length} telas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.18)", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Salvar rascunho
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <Play className="h-4 w-4" />
            Publicar
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: add screens */}
        <div
          className="w-52 shrink-0 flex flex-col gap-0.5 p-3 overflow-y-auto"
          style={{ backgroundColor: "var(--ei-surface-card)", borderRight: "1px solid rgba(159,176,201,0.18)" }}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest px-2" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
            Adicionar tela
          </p>
          {SCREEN_TEMPLATES.map(t => {
            const Icon = t.icon;
            const s = SCREEN_STYLE[t.type];
            return (
              <button
                key={t.type}
                onClick={() => addScreen(t.type)}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                style={{ border: "1px solid transparent" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(43,111,219,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(43,111,219,0.18)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                }}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5" style={{ backgroundColor: s.bg }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: s.icon }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Canvas */}
        <div
          className="relative flex-1 overflow-auto"
          style={{
            backgroundColor: "#060f1c",
            backgroundImage: "radial-gradient(rgba(43,111,219,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <Connectors screens={screens} />
          {screens.map(screen => (
            <ScreenNode
              key={screen.id}
              screen={screen}
              selected={selected === screen.id}
              onClick={() => setSelected(screen.id)}
            />
          ))}
        </div>

        {/* Right: properties */}
        {selectedScreen && (
          <div
            className="w-64 shrink-0 overflow-y-auto p-4"
            style={{ backgroundColor: "var(--ei-surface-card)", borderLeft: "1px solid rgba(159,176,201,0.18)" }}
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
              Propriedades
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                  Título
                </label>
                <input
                  value={selectedScreen.title}
                  onChange={e =>
                    setScreens(prev =>
                      prev.map(s => s.id === selectedScreen.id ? { ...s, title: e.target.value } : s)
                    )
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.18)", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                  Tipo
                </label>
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.14)" }}
                >
                  <span className="text-xs capitalize" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {selectedScreen.type}
                  </span>
                </div>
              </div>
              {selectedScreen.type === "form" && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                    Campos
                  </p>
                  {["Nome", "E-mail", "Telefone"].map(field => (
                    <div key={field} className="mb-1.5 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--ei-cobalt)" }} />
                      <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{field}</span>
                    </div>
                  ))}
                  <button className="mt-1 text-[11px]" style={{ color: "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    + Adicionar campo
                  </button>
                </div>
              )}
              {selectedScreen.type === "decision" && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                    Condições
                  </p>
                  {["Sim → continuar", "Não → encerrar"].map(c => (
                    <div key={c} className="mb-1.5 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "rgba(234,154,13,0.06)", border: "1px solid rgba(234,154,13,0.15)" }}>
                      <span className="text-[11px]" style={{ color: "#EAA40D", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  setScreens(prev => prev.filter(s => s.id !== selectedScreen.id));
                  setSelected(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                style={{ color: "#f87171" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(239,68,68,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover tela
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WAFlowsPage() {
  const [flows, setFlows] = useState<WAFlow[]>(MOCK_FLOWS);
  const [editingFlow, setEditingFlow] = useState<WAFlow | null>(null);

  if (editingFlow) {
    return <FlowBuilder flow={editingFlow} onClose={() => setEditingFlow(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            WA Flows
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Crie flows interativos nativos do WhatsApp — formulários, pesquisas e experiências ricas sem sair do app.
          </p>
        </div>
        <button
          onClick={() => {
            const newFlow: WAFlow = {
              id: `flow-${Date.now()}`,
              name: "Novo Flow",
              description: "",
              status: "draft",
              screens: 0,
              responses: 0,
              updatedAt: "agora",
            };
            setFlows(prev => [newFlow, ...prev]);
            setEditingFlow(newFlow);
          }}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <Plus className="h-4 w-4" />
          Novo flow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Flows ativos",        value: "2" },
          { label: "Respostas este mês",  value: "440" },
          { label: "Taxa de conclusão",   value: "78%" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</p>
            <p className="mt-1.5 text-2xl font-bold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Flow cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {flows.map(flow => {
          const s = STATUS[flow.status];
          return (
            <div
              key={flow.id}
              className="rounded-xl p-5 transition-colors"
              style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(43,111,219,0.35)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(159,176,201,0.18)"; }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(43,111,219,0.12)" }}>
                  <Layers className="h-4 w-4" style={{ color: "var(--ei-cobalt)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {flow.name}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: s.bg, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {flow.description || "Sem descrição."}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <Square className="h-3 w-3" /> {flow.screens} telas
                    </span>
                    {flow.responses > 0 && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                        <MessageSquare className="h-3 w-3" /> {flow.responses} respostas
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <Clock className="h-3 w-3" /> {flow.updatedAt}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => setEditingFlow(flow)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                  style={{ backgroundColor: "rgba(43,111,219,0.10)", color: "var(--ei-cobalt)", border: "1px solid rgba(43,111,219,0.18)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Editar flow <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ color: "var(--ei-text-soft)", border: "1px solid rgba(159,176,201,0.14)" }}
                  title="Duplicar"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setFlows(prev => prev.filter(f => f.id !== flow.id))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ color: "var(--ei-text-soft)", border: "1px solid rgba(159,176,201,0.14)" }}
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
