"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Coins, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES } from "@/lib/currency";
import { SettingsPanelHead } from "./settings-panel-head";

export function DealsSettings() {
  const supabase = createClient();
  const {
    accountId,
    defaultCurrency,
    canEditSettings,
    profileLoading,
    refreshProfile,
  } = useAuth();

  const [selected, setSelected] = useState(defaultCurrency);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(defaultCurrency);
  }, [defaultCurrency]);

  const dirty = selected !== defaultCurrency;

  async function handleSave() {
    if (!accountId || !dirty) return;
    setSaving(true);
    const { error } = await supabase
      .from("accounts")
      .update({ default_currency: selected })
      .eq("id", accountId);
    if (error) {
      toast.error("Falha ao salvar moeda padrão");
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
    toast.success("Moeda padrão atualizada");
  }

  return (
    <section className="max-w-2xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Negócios e moeda"
        description="A moeda usada para novos negócios e nos totais do pipeline e do dashboard."
      />
      <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", padding: "20px" }}>
        <div className="flex items-center gap-2 mb-1">
          <Coins className="size-4" style={{ color: "var(--ei-cobalt)" }} />
          <p className="font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Moeda padrão</p>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Novos negócios usam esta moeda por padrão, e os totais do pipeline e do dashboard são exibidos nela. Negócios existentes mantêm a moeda com que foram salvos.
        </p>
        <div className="grid gap-2 sm:max-w-xs">
          <label className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Moeda</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={!canEditSettings || profileLoading}
            className="h-9 w-full rounded-lg px-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: "rgba(159,176,201,0.08)",
              border: "1px solid rgba(159,176,201,0.22)",
              color: "var(--ei-offwhite)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} style={{ backgroundColor: "#0d1e36" }}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
          {!canEditSettings && (
            <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Apenas admins da conta podem alterar a moeda padrão.
            </p>
          )}
        </div>

        {canEditSettings && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!saving && dirty) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
