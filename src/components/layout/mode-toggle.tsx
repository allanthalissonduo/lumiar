"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";

export function ModeToggle({ className }: { className?: string }) {
  const { mode, toggleMode } = useTheme();
  const goingTo = mode === "dark" ? "claro" : "escuro";
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={`Alternar para modo ${goingTo}`}
      title={`Alternar para modo ${goingTo}`}
      className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${className ?? ""}`}
      style={{ color: "var(--ei-text-soft)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)";
      }}
    >
      {mode === "dark" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}
