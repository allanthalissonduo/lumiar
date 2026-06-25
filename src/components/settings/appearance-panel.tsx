"use client";

import { Check, Moon, Palette, SunMoon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { MODES, THEMES, type Mode, type ThemeId } from "@/lib/themes";
import { SettingsPanelHead } from "./settings-panel-head";

/**
 * Appearance panel — light/dark mode + accent-color picker.
 *
 * Two independent controls: a mode toggle (light / dark) and the
 * accent grid. Either applies + persists immediately. No save button:
 * each change is a single attribute swap on <html>, there's nothing
 * to roll back.
 *
 * Persistence: localStorage only (device-scoped). The boot script in
 * layout.tsx replays both choices before first paint on subsequent
 * loads.
 */
export function AppearancePanel() {
  const { theme, setTheme, mode, setMode } = useTheme();
  return (
    <section className="max-w-3xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Appearance"
        description="Set the mode and accent colour used across the app. Saved to this device — try it, it changes live."
      />

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <SunMoon className="size-4" style={{ color: "var(--ei-text-soft)" }} />
          Modo
        </h3>

        <div
          role="radiogroup"
          aria-label="Color mode"
          className="grid max-w-md grid-cols-2 gap-3"
        >
          {MODES.map((m) => (
            <ModeCard
              key={m}
              mode={m}
              isActive={m === mode}
              onPick={() => setMode(m)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <Palette className="size-4" style={{ color: "var(--ei-text-soft)" }} />
          Cor de destaque
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => (
            <ThemeCard
              key={t.id}
              id={t.id}
              name={t.name}
              tagline={t.tagline}
              swatch={t.swatch}
              isActive={t.id === theme}
              onPick={() => setTheme(t.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ModeCard({
  mode,
  isActive,
  onPick,
}: {
  mode: Mode;
  isActive: boolean;
  onPick: () => void;
}) {
  const isLight = mode === "light";
  const Icon = isLight ? Sun : Moon;
  return (
    <button
      type="button"
      role="radio"
      onClick={onPick}
      aria-checked={isActive}
      aria-label={`Use ${mode} mode`}
      className="flex items-center gap-3 rounded-lg p-4 text-left transition-colors"
      style={{
        backgroundColor: "var(--ei-surface-card)",
        border: isActive ? "1px solid rgba(43,111,219,0.55)" : "1px solid rgba(159,176,201,0.18)",
        boxShadow: isActive ? "0 0 0 2px rgba(43,111,219,0.20)" : "none",
      }}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(159,176,201,0.10)", color: "var(--ei-offwhite)" }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-semibold capitalize" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {mode === "light" ? "Claro" : "Escuro"}
      </span>
      {isActive && (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: "rgba(26,184,160,0.12)", color: "var(--ei-iris)" }}>
          <Check className="h-3 w-3" />
          Ativo
        </span>
      )}
    </button>
  );
}

function ThemeCard({
  id,
  name,
  tagline,
  swatch,
  isActive,
  onPick,
}: {
  id: ThemeId;
  name: string;
  tagline: string;
  swatch: string;
  isActive: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={isActive}
      aria-label={`Use ${name} theme`}
      className="flex flex-col gap-3 rounded-lg p-4 text-left transition-colors"
      style={{
        backgroundColor: "var(--ei-surface-card)",
        border: isActive ? "1px solid rgba(43,111,219,0.55)" : "1px solid rgba(159,176,201,0.18)",
        boxShadow: isActive ? "0 0 0 2px rgba(43,111,219,0.20)" : "none",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden
          className="h-8 w-8 shrink-0 rounded-full"
          style={{ background: swatch, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
        />
        {isActive && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: "rgba(26,184,160,0.12)", color: "var(--ei-iris)" }}>
            <Check className="h-3 w-3" />
            Ativo
          </span>
        )}
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{name}</div>
        <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {tagline}
        </div>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full" aria-hidden>
        <span className="flex-1" style={{ background: swatch }} />
        <span className="w-3" style={{ backgroundColor: "rgba(159,176,201,0.40)" }} />
        <span className="w-3" style={{ backgroundColor: "rgba(159,176,201,0.15)" }} />
        <span className="w-3" style={{ backgroundColor: "var(--ei-surface-card)" }} />
      </div>
      <span className="sr-only">Theme id: {id}</span>
    </button>
  );
}
