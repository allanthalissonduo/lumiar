"use client";

import { useState } from "react";
import {
  Package,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ImageIcon,
  Tag,
  BarChart3,
  ExternalLink,
  ChevronDown,
  Filter,
} from "lucide-react";

// ── Types & mock data ────────────────────────────────────────────────────────

type SyncStatus = "synced" | "pending" | "error";
type Availability = "available" | "unavailable" | "low";

interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: string;
  availability: Availability;
  syncStatus: SyncStatus;
  waEnabled: boolean;
  imageUrl?: string;
  stock: number;
}

const MOCK_PRODUCTS: CatalogProduct[] = [
  { id: "p1", sku: "CAM-001", name: "Camiseta Básica Preta", category: "Vestuário", price: "R$ 59,90", availability: "available", syncStatus: "synced", waEnabled: true, stock: 142 },
  { id: "p2", sku: "CAL-004", name: "Calça Jeans Slim", category: "Vestuário", price: "R$ 189,90", availability: "available", syncStatus: "synced", waEnabled: true, stock: 67 },
  { id: "p3", sku: "TEN-012", name: "Tênis Casual Branco", category: "Calçados", price: "R$ 299,00", availability: "low", syncStatus: "synced", waEnabled: true, stock: 8 },
  { id: "p4", sku: "BOL-003", name: "Bolsa Couro Caramelo", category: "Acessórios", price: "R$ 420,00", availability: "available", syncStatus: "pending", waEnabled: false, stock: 23 },
  { id: "p5", sku: "REL-007", name: "Relógio Minimalista", category: "Acessórios", price: "R$ 750,00", availability: "unavailable", syncStatus: "error", waEnabled: false, stock: 0 },
  { id: "p6", sku: "OCU-002", name: "Óculos de Sol Gatinho", category: "Acessórios", price: "R$ 145,00", availability: "available", syncStatus: "synced", waEnabled: true, stock: 55 },
  { id: "p7", sku: "CAM-015", name: "Camisa Social Branca", category: "Vestuário", price: "R$ 129,90", availability: "available", syncStatus: "synced", waEnabled: false, stock: 34 },
  { id: "p8", sku: "SAP-008", name: "Sapato Oxford Marrom", category: "Calçados", price: "R$ 390,00", availability: "low", syncStatus: "pending", waEnabled: false, stock: 4 },
];

const SYNC_STYLE: Record<SyncStatus, { bg: string; color: string; label: string; icon: typeof CheckCircle2 }> = {
  synced:  { bg: "rgba(26,184,160,0.10)",  color: "var(--ei-iris)",      label: "Sincronizado", icon: CheckCircle2 },
  pending: { bg: "rgba(234,154,13,0.10)",  color: "#EAA40D",             label: "Pendente",     icon: Clock },
  error:   { bg: "rgba(239,68,68,0.10)",   color: "#f87171",             label: "Erro",         icon: AlertCircle },
};

const AVAIL_STYLE: Record<Availability, { color: string; label: string }> = {
  available:   { color: "var(--ei-iris)",      label: "Disponível" },
  low:         { color: "#EAA40D",             label: "Estoque baixo" },
  unavailable: { color: "#f87171",             label: "Indisponível" },
};

const CATEGORIES = ["Todos", "Vestuário", "Calçados", "Acessórios"];

// ── Product row ───────────────────────────────────────────────────────────────

function ProductRow({
  product,
  onToggleWA,
}: {
  product: CatalogProduct;
  onToggleWA: (id: string) => void;
}) {
  const sync = SYNC_STYLE[product.syncStatus];
  const avail = AVAIL_STYLE[product.availability];
  const SyncIcon = sync.icon;

  return (
    <tr style={{ borderBottom: "1px solid rgba(159,176,201,0.08)" }}>
      <td className="py-3 pl-5 pr-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.12)" }}
          >
            <ImageIcon className="h-4 w-4" style={{ color: "var(--ei-text-soft)" }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {product.name}
            </p>
            <p className="text-[10px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
              {product.sku}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {product.category}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'JetBrains Mono', monospace" }}>
          {product.price}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: avail.color }} />
          <span className="text-xs" style={{ color: avail.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {avail.label}
          </span>
          {product.availability === "low" && (
            <span className="text-[10px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
              ({product.stock})
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: sync.bg, color: sync.color, fontFamily: "'JetBrains Mono', monospace" }}
        >
          <SyncIcon className="h-3 w-3" />
          {sync.label}
        </span>
      </td>
      <td className="px-3 py-3 pr-5">
        <button
          onClick={() => onToggleWA(product.id)}
          className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
          style={{ backgroundColor: product.waEnabled ? "var(--ei-cobalt)" : "rgba(159,176,201,0.20)" }}
          role="switch"
          aria-checked={product.waEnabled}
          title={product.waEnabled ? "Remover do catálogo WhatsApp" : "Adicionar ao catálogo WhatsApp"}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
            style={{ backgroundColor: "#fff", transform: product.waEnabled ? "translateX(18px)" : "translateX(2px)" }}
          />
        </button>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>(MOCK_PRODUCTS);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  function toggleWA(id: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, waEnabled: !p.waEnabled } : p));
  }

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1800);
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || p.category === category;
    return matchSearch && matchCat;
  });

  const waCount = products.filter(p => p.waEnabled).length;
  const syncedCount = products.filter(p => p.syncStatus === "synced").length;
  const errorCount = products.filter(p => p.syncStatus === "error").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Catálogo VTEX
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Sincronize produtos da sua loja VTEX com o Catálogo WhatsApp Business.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.18)", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir no Meta
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "Sincronizar VTEX"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total de produtos",    value: products.length.toString(),  icon: Package,        color: "var(--ei-cobalt)" },
          { label: "No catálogo WA",       value: waCount.toString(),          icon: Tag,            color: "var(--ei-iris)" },
          { label: "Sincronizados",        value: syncedCount.toString(),      icon: CheckCircle2,   color: "var(--ei-iris)" },
          { label: "Com erro",             value: errorCount.toString(),       icon: AlertCircle,    color: errorCount > 0 ? "#f87171" : "var(--ei-text-soft)" },
        ].map(s => {
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

      {/* Sync progress bar */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Progresso de sincronização
          </p>
          <span className="text-[11px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
            Última sync: há 4 minutos
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(159,176,201,0.08)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round((syncedCount / products.length) * 100)}%`, backgroundColor: "var(--ei-cobalt)" }}
          />
        </div>
        <div className="mt-2 flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ei-iris)", fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--ei-cobalt)" }} />
            {syncedCount} sincronizados
          </span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#EAA40D", fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#EAA40D" }} />
            {products.filter(p => p.syncStatus === "pending").length} pendentes
          </span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#f87171", fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#f87171" }} />
              {errorCount} com erro
            </span>
          )}
        </div>
      </div>

      {/* Filters + table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(159,176,201,0.12)" }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--ei-text-soft)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou SKU…"
              className="w-full rounded-lg py-2 pl-9 pr-3 text-sm outline-none"
              style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.14)", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: category === cat ? "var(--ei-cobalt)" : "rgba(159,176,201,0.06)",
                  color: category === cat ? "#fff" : "var(--ei-text-soft)",
                  border: `1px solid ${category === cat ? "transparent" : "rgba(159,176,201,0.14)"}`,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(159,176,201,0.12)" }}>
                {["Produto", "Categoria", "Preço", "Disponibilidade", "VTEX Sync", "WhatsApp"].map(h => (
                  <th
                    key={h}
                    className={`py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest ${h === "Produto" ? "pl-5 pr-3" : "px-3"}`}
                    style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Nenhum produto encontrado.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => <ProductRow key={p.id} product={p} onToggleWA={toggleWA} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(159,176,201,0.08)" }}>
          <p className="text-[11px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length} produto{filtered.length !== 1 ? "s" : ""} · {waCount} habilitado{waCount !== 1 ? "s" : ""} no WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}
