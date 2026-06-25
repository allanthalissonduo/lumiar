"use client";

/**
 * View-switcher for the flow editor.
 *
 * Renders a small Canvas / List pill above whichever view is active,
 * and conditionally mounts `<FlowCanvas>` or `<FlowBuilder>`. Why a
 * separate component:
 *   - The page itself stays trivially small (loading + error + this).
 *   - Either view can stay unaware of the other — they share data
 *     (`{flow, nodes}`) and nothing else.
 *
 * View choice persists per-browser via localStorage so a power user
 * who prefers the list isn't fighting the default on every load.
 * Canvas is the default for everyone else — the original user
 * feedback was that the list shape made flows "hard to understand".
 */

import { useEffect, useState } from "react";
import { LayoutGrid, ListTree } from "lucide-react";

import { FlowBuilder } from "./flow-builder";
import { FlowCanvas } from "./flow-canvas";
import { FlowEditorProvider } from "./flow-editor-state";
import { EditorHeader } from "./header";
import { ValidationPanel } from "./validation-panel";
import type { FlowRow, FlowNodeRow } from "@/lib/flows/types";

/**
 * Below this viewport width we force list view and hide the toggle.
 * Canvas with drag-to-connect on a phone is unusable — handles are
 * ~10px and live finger drags from one node to another aren't a
 * practical workflow. Matches Tailwind's `md` breakpoint.
 */
const MOBILE_BREAKPOINT = "(max-width: 767px)";

type View = "canvas" | "list";

const STORAGE_KEY = "wacrm.flowEditor.view";

interface Props {
  initialFlow: FlowRow;
  initialNodes: FlowNodeRow[];
}

export function FlowEditorShell({ initialFlow, initialNodes }: Props) {
  // Read the persisted choice in the useState initializer. Safe even
  // though this is a client component because the parent page only
  // mounts us AFTER a client-side fetch resolves — there's no SSR
  // pass for this subtree, so no hydration mismatch to worry about.
  // Default to `canvas` (the new default) when nothing is saved.
  const [view, setView] = useState<View>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "canvas" || saved === "list") return saved;
    } catch {
      // Private browsing / disabled storage — fall through to default.
    }
    return "canvas";
  });

  // Live mobile detection. We don't render canvas under the
  // breakpoint regardless of `view` — but we keep `view` itself
  // intact so the user's preference comes back when they widen
  // again (e.g. rotating a tablet, resizing a window).
  const isMobile = useMatchMedia(MOBILE_BREAKPOINT);
  const effectiveView: View = isMobile ? "list" : view;

  const choose = (next: View) => {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <FlowEditorProvider initialFlow={initialFlow} initialNodes={initialNodes}>
      <div style={{ maxWidth: "56rem", margin: "0 auto", display: "flex", height: "100%", flexDirection: "column", gap: "1.5rem", padding: "1.5rem" }}>
        <EditorHeader />
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <div
              role="group"
              aria-label="Editor view"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                borderRadius: "0.375rem",
                border: "1px solid rgba(159,176,201,0.18)",
                background: "var(--ei-surface-card, #0E1C32)",
                padding: "0.125rem",
                fontSize: "0.75rem",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <ToggleButton
                active={effectiveView === "canvas"}
                onClick={() => choose("canvas")}
                icon={<LayoutGrid style={{ width: "0.75rem", height: "0.75rem" }} />}
                label="Canvas"
              />
              <ToggleButton
                active={effectiveView === "list"}
                onClick={() => choose("list")}
                icon={<ListTree style={{ width: "0.75rem", height: "0.75rem" }} />}
                label="List"
              />
            </div>
          </div>
        )}

        {effectiveView === "canvas" ? <FlowCanvas /> : <FlowBuilder />}

        {/* Sticky-bottom validation panel mirrors the placement used
            when this lived inside FlowBuilder — the activate-readiness
            status follows the user as they scroll, in either view. */}
        <div style={{ position: "sticky", bottom: "1rem", zIndex: 10, boxShadow: "0 20px 25px -5px rgba(10,22,40,0.6), 0 8px 10px -6px rgba(10,22,40,0.6)" }}>
          <ValidationPanel />
        </div>
      </div>
    </FlowEditorProvider>
  );
}

/**
 * Tiny `useMatchMedia` shim. We could pull in `react-responsive` but
 * this is the only consumer and matchMedia is one of those browser
 * APIs that doesn't need a dependency.
 */
function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    // Safari < 14 still uses addListener; addEventListener is the
    // modern path. Both fire identically.
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        borderRadius: "0.25rem",
        padding: "0.25rem 0.5rem",
        border: "none",
        cursor: "pointer",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: "0.75rem",
        transition: "background 0.15s, color 0.15s",
        background: active ? "rgba(159,176,201,0.14)" : "transparent",
        color: active ? "var(--ei-offwhite)" : "var(--ei-text-soft)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(159,176,201,0.08)";
          e.currentTarget.style.color = "var(--ei-offwhite)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--ei-text-soft)";
        }
      }}
    >
      {icon}
      {label}
    </button>
  );
}
