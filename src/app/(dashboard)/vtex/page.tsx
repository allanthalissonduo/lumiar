"use client";

import { useState } from "react";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
  BarChart3,
  Users,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Loader2,
  Settings,
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────────────────────

const ORDER_STATS = [
  { label: "Pedidos hoje", value: "47", delta: "+12%", positive: true },
  { label: "Receita hoje", value: "R$ 8.240", delta: "+8%", positive: true },
  { label: "Ticket médio", value: "R$ 175", delta: "-2%", positive: false },
  { label: "Carrinhos abandonados", value: "23", delta: "+5", positive: false },
];

const RECENT_ORDERS = [
  { id: "#78901", customer: "Ana Lima", status: "Aguardando pagamento", total: "R$ 320,00", time: "há 3min", statusKey: "pending" },
  { id: "#78900", customer: "Carlos Mendes", status: "Pagamento aprovado", total: "R$ 89,90", time: "há 11min", statusKey: "approved" },
  { id: "#78899", customer: "Fernanda Rocha", status: "Em separação", total: "R$ 512,00", time: "há 28min", statusKey: "picking" },
  { id: "#78898", customer: "Gabriel Costa", status: "Saiu para entrega", total: "R$ 199,00", time: "há 45min", statusKey: "shipped" },
  { id: "#78897", customer: "Isabela Nunes", status: "Entregue", total: "R$ 74,50", time: "há 1h", statusKey: "delivered" },
];

const AUTOMATIONS = [
  {
    id: "abandon-cart",
    name: "Recuperação de Carrinho",
    description: "Envia mensagem WhatsApp 1h após abandono com link do carrinho.",
    active: true,
    triggers: 23,
    conversions: 8,
  },
  {
    id: "order-confirm",
    name: "Confirmação de Pedido",
    description: "Notifica cliente assim que o pagamento é aprovado.",
    active: true,
    triggers: 47,
    conversions: 47,
  },
  {
    id: "shipping-update",
    name: "Atualização de Envio",
    description: "Envia código de rastreio quando o pedido sai para entrega.",
    active: true,
    triggers: 31,
    conversions: 31,
  },
  {
    id: "post-delivery",
    name: "Pesquisa Pós-Entrega",
    description: "Solicita avaliação 24h após confirmação de entrega.",
    active: false,
    triggers: 0,
    conversions: 0,
  },
  {
    id: "price-drop",
    name: "Alerta de Preço",
    description: "Notifica quando produto em wishlist tem desconto ≥ 15%.",
    active: false,
    triggers: 0,
    conversions: 0,
  },
];

const CONVERSION_FUNNEL = [
  { label: "Carrinhos criados", value: 312, pct: 100, color: "var(--ei-cobalt)" },
  { label: "Checkout iniciado", value: 198, pct: 63, color: "var(--ei-iris)" },
  { label: "Pagamento aprovado", value: 142, pct: 46, color: "#8B5CF6" },
  { label: "Pedido entregue", value: 131, pct: 42, color: "#10B981" },
];

// ── Status styling ───────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { bg: string; color: string; dot: string }> = {
  pending:   { bg: "rgba(234,154,13,0.10)", color: "#EAA40D", dot: "#EAA40D" },
  approved:  { bg: "rgba(43,111,219,0.10)", color: "var(--ei-cobalt)", dot: "var(--ei-cobalt)" },
  picking:   { bg: "rgba(139,92,246,0.10)", color: "#a78bfa", dot: "#a78bfa" },
  shipped:   { bg: "rgba(26,184,160,0.12)", color: "var(--ei-iris)", dot: "var(--ei-iris)" },
  delivered: { bg: "rgba(16,185,129,0.10)", color: "#10B981", dot: "#10B981" },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, delta, positive }: (typeof ORDER_STATS)[0]) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {value}
      </p>
      <span
        className="mt-1 inline-block text-xs font-medium"
        style={{ color: positive ? "var(--ei-iris)" : "#f87171", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {delta}
      </span>
    </div>
  );
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
      style={{ backgroundColor: active ? "var(--ei-cobalt)" : "rgba(159,176,201,0.20)" }}
      role="switch"
      aria-checked={active}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
        style={{ backgroundColor: "#fff", transform: active ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function ConversionBar({ item }: { item: (typeof CONVERSION_FUNNEL)[0] }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.label}</span>
        <span className="text-xs font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'JetBrains Mono', monospace" }}>
          {item.value} <span style={{ color: "var(--ei-text-soft)" }}>({item.pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(159,176,201,0.08)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${item.pct}%`, backgroundColor: item.color }}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VTEXPage() {
  const [automations, setAutomations] = useState(AUTOMATIONS);
  const [syncing, setSyncing] = useState(false);

  function toggleAutomation(id: string) {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  }

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1800);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            VTEX Commerce
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Pedidos, catálogo e automações de WhatsApp integradas à sua loja VTEX.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "rgba(159,176,201,0.06)",
              border: "1px solid rgba(159,176,201,0.18)",
              color: "var(--ei-text-soft)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "Sincronizar"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.18)", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <Settings className="h-4 w-4" />
            Configurar
          </button>
        </div>
      </div>

      {/* Connection status banner */}
      <div
        className="flex items-center gap-3 rounded-xl px-5 py-3"
        style={{ backgroundColor: "rgba(26,184,160,0.08)", border: "1px solid rgba(26,184,160,0.20)" }}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--ei-iris)" }} />
        <p className="text-sm" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Conectado à loja <strong>vtex-demo.myvtex.com</strong> — última sincronização há 2 minutos.
        </p>
        <button className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Ver detalhes <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ORDER_STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Two-column: orders + funnel */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent orders */}
        <div
          className="rounded-xl lg:col-span-3"
          style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(159,176,201,0.12)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Pedidos recentes
            </h2>
            <button className="flex items-center gap-1 text-xs" style={{ color: "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Ver todos <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div>
            {RECENT_ORDERS.map((order, i) => {
              const s = ORDER_STATUS[order.statusKey] ?? ORDER_STATUS.pending;
              return (
                <div
                  key={order.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                  style={{ borderBottom: i < RECENT_ORDERS.length - 1 ? "1px solid rgba(159,176,201,0.08)" : "none" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: "var(--ei-cobalt)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {order.id}
                      </span>
                      <span className="text-xs" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {order.customer}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: s.bg, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{order.total}</p>
                    <p className="text-[10px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{order.time}</p>
                  </div>
                  <button
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                    style={{ color: "var(--ei-text-soft)" }}
                    title="Abrir conversa no WhatsApp"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion funnel */}
        <div
          className="rounded-xl p-5 lg:col-span-2"
          style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Funil de conversão
            </h2>
            <BarChart3 className="h-4 w-4" style={{ color: "var(--ei-text-soft)" }} />
          </div>
          <div className="space-y-4">
            {CONVERSION_FUNNEL.map(item => <ConversionBar key={item.label} item={item} />)}
          </div>
          <div className="mt-5 rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(43,111,219,0.08)", border: "1px solid rgba(43,111,219,0.16)" }}>
            <p className="text-xs" style={{ color: "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <strong>+18 recuperações</strong> via WhatsApp este mês — R$ 3.140 em pedidos adicionais.
            </p>
          </div>
        </div>
      </div>

      {/* Automations */}
      <div
        className="rounded-xl"
        style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(159,176,201,0.12)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Automações WhatsApp
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Mensagens automáticas disparadas por eventos da loja VTEX.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: "rgba(43,111,219,0.10)", color: "var(--ei-cobalt)", border: "1px solid rgba(43,111,219,0.20)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <Zap className="h-3.5 w-3.5" />
            Nova automação
          </button>
        </div>
        <div>
          {automations.map((auto, i) => (
            <div
              key={auto.id}
              className="flex items-start gap-4 px-5 py-4"
              style={{ borderBottom: i < automations.length - 1 ? "1px solid rgba(159,176,201,0.08)" : "none" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5"
                style={{ backgroundColor: auto.active ? "rgba(43,111,219,0.12)" : "rgba(159,176,201,0.06)" }}
              >
                <Zap className="h-4 w-4" style={{ color: auto.active ? "var(--ei-cobalt)" : "var(--ei-text-soft)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {auto.name}
                  </p>
                  {auto.active && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: "rgba(26,184,160,0.10)", color: "var(--ei-iris)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--ei-iris)" }} />
                      Ativo
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {auto.description}
                </p>
                {auto.active && auto.triggers > 0 && (
                  <div className="mt-2 flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <Users className="h-3 w-3" /> {auto.triggers} disparos hoje
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ei-iris)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <CheckCircle2 className="h-3 w-3" /> {auto.conversions} conversões
                    </span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 mt-0.5">
                <button className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: "var(--ei-text-soft)" }}>
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <Toggle active={auto.active} onChange={() => toggleAutomation(auto.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
