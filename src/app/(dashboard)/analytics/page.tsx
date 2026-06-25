"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  ShoppingCart,
  DollarSign,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Send,
  CheckCheck,
  Eye,
} from "lucide-react";

// ── Types & mock data ────────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d";

const RANGE_LABELS: Record<Range, string> = { "7d": "7 dias", "30d": "30 dias", "90d": "90 dias" };

interface KPI {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: typeof MessageSquare;
  color: string;
  sub?: string;
}

const KPIS: KPI[] = [
  { label: "Receita WhatsApp", value: "R$ 48.320", delta: "+23%", positive: true, icon: DollarSign, color: "var(--ei-iris)", sub: "vs período anterior" },
  { label: "Conversas iniciadas", value: "1.847", delta: "+15%", positive: true, icon: MessageSquare, color: "var(--ei-cobalt)", sub: "últimos 30 dias" },
  { label: "Taxa de conversão", value: "11,4%", delta: "+2,1pp", positive: true, icon: TrendingUp, color: "#a78bfa", sub: "conversa → compra" },
  { label: "Carrinhos recuperados", value: "124", delta: "+38%", positive: true, icon: ShoppingCart, color: "#EAA40D", sub: "via WhatsApp" },
];

const TOP_PRODUCTS = [
  { name: "Camiseta Básica Preta", sku: "CAM-001", revenue: "R$ 8.540", orders: 142, growth: "+18%" },
  { name: "Calça Jeans Slim",      sku: "CAL-004", revenue: "R$ 6.234", orders: 33,  growth: "+7%" },
  { name: "Tênis Casual Branco",   sku: "TEN-012", revenue: "R$ 5.980", orders: 20,  growth: "+31%" },
  { name: "Óculos de Sol Gatinho", sku: "OCU-002", revenue: "R$ 3.625", orders: 25,  growth: "+12%" },
  { name: "Relógio Minimalista",   sku: "REL-007", revenue: "R$ 2.250", orders: 3,   growth: "-5%" },
];

const CHANNEL_BREAKDOWN = [
  { label: "Carrinho abandonado",  pct: 34, value: "R$ 16.428", color: "#EAA40D" },
  { label: "Recomendação de IA",   pct: 28, value: "R$ 13.530", color: "var(--ei-cobalt)" },
  { label: "Broadcast",           pct: 22, value: "R$ 10.630", color: "#a78bfa" },
  { label: "Atendimento humano",   pct: 16, value: "R$ 7.731",  color: "var(--ei-iris)" },
];

const AGENT_STATS = [
  { label: "Msgs enviadas pelo agente", value: "6.241",  icon: Bot,       color: "var(--ei-cobalt)" },
  { label: "Taxa de resolução s/ humano", value: "73%",  icon: CheckCheck,color: "var(--ei-iris)" },
  { label: "Broadcasts enviados",       value: "18",     icon: Send,      color: "#a78bfa" },
  { label: "Taxa de leitura média",     value: "61%",    icon: Eye,       color: "#EAA40D" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const SPARKLINE_30D = [12, 19, 14, 28, 22, 35, 30, 42, 38, 45, 41, 52, 48, 61, 55, 68, 60, 74, 69, 82, 77, 89, 83, 95, 88, 102, 96, 115, 108, 124];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const h = 40;
  const w = 120;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill={color}
        opacity={0.08}
      />
    </svg>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function KPICard({ kpi }: { kpi: KPI }) {
  const Icon = kpi.icon;
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${kpi.color}18` }}>
          <Icon className="h-5 w-5" style={{ color: kpi.color }} />
        </div>
        <Sparkline data={SPARKLINE_30D} color={kpi.color} />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
        {kpi.label}
      </p>
      <p className="mt-1 text-2xl font-bold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {kpi.value}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {kpi.positive
          ? <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "var(--ei-iris)" }} />
          : <ArrowDownRight className="h-3.5 w-3.5" style={{ color: "#f87171" }} />
        }
        <span className="text-xs font-medium" style={{ color: kpi.positive ? "var(--ei-iris)" : "#f87171", fontFamily: "'JetBrains Mono', monospace" }}>
          {kpi.delta}
        </span>
        {kpi.sub && <span className="text-[11px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{kpi.sub}</span>}
      </div>
    </div>
  );
}

function ChannelBar({ item }: { item: (typeof CHANNEL_BREAKDOWN)[0] }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.value}</span>
          <span className="text-[10px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{item.pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(159,176,201,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Analytics
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Performance do canal WhatsApp — conversas, conversões e receita VTEX.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.14)" }}>
          {(["7d", "30d", "90d"] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: range === r ? "var(--ei-cobalt)" : "transparent",
                color: range === r ? "#fff" : "var(--ei-text-soft)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map(kpi => <KPICard key={kpi.label} kpi={kpi} />)}
      </div>

      {/* Middle row */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Top products */}
        <div className="rounded-xl lg:col-span-3" style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(159,176,201,0.12)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Top produtos via WhatsApp
            </h2>
            <BarChart3 className="h-4 w-4" style={{ color: "var(--ei-text-soft)" }} />
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(159,176,201,0.08)" }}>
                {["Produto", "Pedidos", "Receita", "Crescimento"].map(h => (
                  <th key={h} className={`py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest ${h === "Produto" ? "pl-5 pr-3" : "px-3"}`} style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_PRODUCTS.map((p, i) => (
                <tr key={p.sku} style={{ borderBottom: i < TOP_PRODUCTS.length - 1 ? "1px solid rgba(159,176,201,0.06)" : "none" }}>
                  <td className="py-3 pl-5 pr-3">
                    <p className="text-xs font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{p.sku}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm tabular-nums" style={{ color: "var(--ei-offwhite)", fontFamily: "'JetBrains Mono', monospace" }}>{p.orders}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'JetBrains Mono', monospace" }}>{p.revenue}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="flex items-center gap-1 text-xs font-medium"
                      style={{ color: p.growth.startsWith("+") ? "var(--ei-iris)" : "#f87171", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {p.growth.startsWith("+") ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {p.growth}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Channel breakdown */}
        <div className="rounded-xl p-5 lg:col-span-2" style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}>
          <h2 className="mb-5 text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Receita por canal
          </h2>
          <div className="space-y-4">
            {CHANNEL_BREAKDOWN.map(item => <ChannelBar key={item.label} item={item} />)}
          </div>
          <div className="mt-5 rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(26,184,160,0.08)", border: "1px solid rgba(26,184,160,0.18)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--ei-iris)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Total no período: <strong>R$ 48.320</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Agent & broadcast stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {AGENT_STATS.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
