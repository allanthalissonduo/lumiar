"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  History,
  Loader2,
  PauseCircle,
  PlayCircle,
  Save,
  Trash2,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  useFlowEditor,
  type BuilderState,
} from "./flow-editor-state";

export function EditorHeader() {
  const router = useRouter();
  const {
    flow,
    state,
    setState,
    dirty,
    saving,
    activating,
    canActivate,
    save,
    setStatus,
    deleteFlow,
  } = useFlowEditor();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--ei-text-soft)" }}>
        <button
          type="button"
          onClick={() => router.push("/flows")}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontFamily: "Plus Jakarta Sans, sans-serif" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ei-offwhite)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ei-text-soft)"; }}
        >
          <ArrowLeft style={{ width: "12px", height: "12px" }} />
          Flows
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", minWidth: 0, flex: 1, alignItems: "center", gap: "12px" }}>
          <Workflow style={{ width: "20px", height: "20px", flexShrink: 0, color: "var(--ei-cobalt)" }} />
          <input
            value={state.name}
            onChange={(e) =>
              setState((s) => ({ ...s, name: e.target.value }))
            }
            placeholder="Flow name"
            style={{
              maxWidth: "448px",
              background: "var(--ei-surface-card)",
              border: "1px solid rgba(159,176,201,0.22)",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--ei-offwhite)",
              fontFamily: "Plus Jakarta Sans, sans-serif",
              outline: "none",
              width: "100%",
            }}
          />
          <StatusBadge status={state.status} />
          {dirty && (
            <span
              style={{ display: "inline-flex", flexShrink: 0, alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fcd34d" }}
              title="Unsaved changes — hit Save to persist"
              aria-live="polite"
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "9999px", background: "#fbbf24" }} />
              Edited
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => router.push(`/flows/${flow.id}/runs`)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--ei-text-soft)", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontFamily: "Plus Jakarta Sans, sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(159,176,201,0.08)"; e.currentTarget.style.color = "var(--ei-offwhite)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--ei-text-soft)"; }}
          >
            <History style={{ width: "14px", height: "14px" }} />
            Runs
          </button>
          <button
            type="button"
            onClick={() => void deleteFlow()}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontFamily: "Plus Jakarta Sans, sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.10)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#f87171"; }}
          >
            <Trash2 style={{ width: "14px", height: "14px" }} />
            Delete
          </button>
          {state.status === "active" ? (
            <button
              type="button"
              onClick={() => void setStatus("draft")}
              disabled={activating}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(159,176,201,0.22)", cursor: activating ? "not-allowed" : "pointer", color: "var(--ei-offwhite)", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontFamily: "Plus Jakarta Sans, sans-serif", opacity: activating ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!activating) e.currentTarget.style.background = "rgba(159,176,201,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              {activating ? (
                <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
              ) : (
                <PauseCircle style={{ width: "14px", height: "14px" }} />
              )}
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void setStatus("active")}
              disabled={activating || !canActivate}
              title={!canActivate ? "Fix the issues below before activating" : undefined}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(159,176,201,0.22)", cursor: (activating || !canActivate) ? "not-allowed" : "pointer", color: "var(--ei-offwhite)", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontFamily: "Plus Jakarta Sans, sans-serif", opacity: (activating || !canActivate) ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!activating && canActivate) e.currentTarget.style.background = "rgba(159,176,201,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              {activating ? (
                <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
              ) : (
                <PlayCircle style={{ width: "14px", height: "14px" }} />
              )}
              Activate
            </button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--ei-cobalt)", border: "none", cursor: saving ? "not-allowed" : "pointer", color: "#fff", padding: "4px 12px", borderRadius: "6px", fontSize: "13px", fontFamily: "Plus Jakarta Sans, sans-serif", opacity: saving ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "var(--ei-royal)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--ei-cobalt)"; }}
          >
            {saving ? (
              <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
            ) : (
              <Save style={{ width: "14px", height: "14px" }} />
            )}
            Save
          </button>
        </div>
      </div>
      <input
        value={state.description}
        onChange={(e) =>
          setState((s) => ({ ...s, description: e.target.value }))
        }
        placeholder="Optional description (internal — customers don't see this)"
        style={{
          background: "var(--ei-surface-card)",
          border: "1px solid rgba(159,176,201,0.22)",
          borderRadius: "6px",
          padding: "6px 10px",
          fontSize: "14px",
          color: "var(--ei-offwhite)",
          fontFamily: "Plus Jakarta Sans, sans-serif",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: BuilderState["status"] }) {
  const styles: Record<BuilderState["status"], React.CSSProperties> = {
    draft: {
      border: "1px solid rgba(159,176,201,0.18)",
      background: "rgba(159,176,201,0.04)",
      color: "var(--ei-text-soft)",
    },
    active: {
      border: "1px solid rgba(52,211,153,0.40)",
      background: "rgba(52,211,153,0.10)",
      color: "#6ee7b7",
    },
    archived: {
      border: "1px solid rgba(159,176,201,0.18)",
      background: "rgba(159,176,201,0.04)",
      color: "var(--ei-text-soft)",
    },
  };
  return (
    <Badge variant="outline" style={{ flexShrink: 0, ...styles[status] }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
