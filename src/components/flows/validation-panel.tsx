"use client";

/**
 * Validation panel — surfaces every error and warning from
 * `validateFlowForActivation`. Lives once at the bottom of the
 * editor shell so it's visible in both views (canvas + list).
 *
 * Node-scoped issues are clickable: tapping one calls
 * `requestFlash(node_key)` on the editor context. List view's
 * useEffect on `flashKey` expands + scrolls + flashes the row;
 * canvas view's useEffect pans the viewport + flashes the card.
 * Both views read the same flashKey so the panel doesn't need
 * per-view plumbing.
 *
 * Trigger-scoped issues are NOT clickable from canvas — trigger
 * config is a list-only panel (it's a flat form, not a graph
 * concept). User can switch to List to address them.
 */

import { CircleAlert, CircleCheck } from "lucide-react";
import type { ValidationIssue } from "@/lib/flows/validate";
import { useFlowEditor } from "./flow-editor-state";

export function ValidationPanel() {
  const { issues, requestFlash } = useFlowEditor();

  if (issues.length === 0) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        borderRadius: "0.5rem",
        border: "1px solid rgba(22,163,74,0.5)",
        background: "var(--ei-abyssal, #0A1628)",
        padding: "0.75rem",
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "#6ee7b7",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <CircleCheck style={{ width: "1rem", height: "1rem", flexShrink: 0 }} />
        No issues. Ready to activate.
      </div>
    );
  }
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return (
    <div style={{
      borderRadius: "0.5rem",
      border: `1px solid ${errors.length > 0 ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"}`,
      background: "var(--ei-abyssal, #0A1628)",
      padding: "0.75rem",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--ei-text-soft)" }}>
        {errors.length > 0 ? (
          <CircleAlert style={{ width: "1rem", height: "1rem", color: "#f87171" }} />
        ) : (
          <CircleAlert style={{ width: "1rem", height: "1rem", color: "#fbbf24" }} />
        )}
        {errors.length} error{errors.length === 1 ? "" : "s"},{" "}
        {warnings.length} warning{warnings.length === 1 ? "" : "s"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {issues.map((i, ix) => (
          <IssueLine key={ix} issue={i} onJump={requestFlash} />
        ))}
      </div>
    </div>
  );
}

/**
 * Exported so the per-node card (list view) and the trigger panel
 * can render the same "icon + node key chip + message" formatting
 * for their own per-row issue lists without re-implementing the
 * tone / icon / accessibility logic.
 */
export function IssueLine({
  issue,
  onJump,
}: {
  issue: ValidationIssue;
  onJump?: (key: string) => void;
}) {
  const color = issue.severity === "error" ? "#fca5a5" : "#fcd34d";
  const iconColor = issue.severity === "error" ? "#f87171" : "#fbbf24";

  const body = (
    <>
      <CircleAlert style={{ marginTop: "0.125rem", width: "0.75rem", height: "0.75rem", flexShrink: 0, color: iconColor }} />
      <span style={{ minWidth: 0, flex: 1 }}>
        {issue.node_key && (
          <code style={{
            marginRight: "0.25rem",
            borderRadius: "0.25rem",
            background: "rgba(159,176,201,0.08)",
            padding: "0.125rem 0.25rem",
            fontSize: "0.625rem",
            color: "var(--ei-text-soft)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {issue.node_key}
          </code>
        )}
        {issue.message}
      </span>
    </>
  );

  if (issue.node_key && onJump) {
    return (
      <button
        type="button"
        onClick={() => onJump(issue.node_key!)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "flex-start",
          gap: "0.5rem",
          borderRadius: "0.375rem",
          padding: "0.25rem 0.5rem",
          textAlign: "left",
          fontSize: "0.75rem",
          border: "none",
          cursor: "pointer",
          background: "transparent",
          color,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(159,176,201,0.06)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        aria-label={`Jump to node ${issue.node_key}`}
      >
        {body}
      </button>
    );
  }
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "0.5rem",
      borderRadius: "0.375rem",
      padding: "0.25rem 0.5rem",
      fontSize: "0.75rem",
      color,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {body}
    </div>
  );
}
