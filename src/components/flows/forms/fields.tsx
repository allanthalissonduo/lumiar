"use client";

/**
 * Reusable field components shared across every per-node form.
 *
 * `NodeKeySelect` — picks a node from the flow's node list, rendered
 * with the source node's icon so the dropdown reads as
 * "destination = ◇ menu" rather than an opaque slug.
 *
 * `NextNodeRow` — wraps NodeKeySelect with a label; the most common
 * per-node form row ("after this node, advance to…").
 *
 * `TextRow` — wraps Input or Textarea behind a label. Pure UI sugar
 * to keep per-node forms uncluttered.
 *
 * Lives in src/components/flows/forms/ so both the list view's
 * collapsed-card editor and the canvas view's side-panel editor
 * (introduced in this PR) mount the exact same form components.
 */

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NODE_META, type BuilderNode } from "../shared";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid rgba(159,176,201,0.22)",
  background: "rgba(159,176,201,0.08)",
  color: "var(--ei-offwhite)",
  fontSize: "12px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

export function TextRow({
  label,
  value,
  onChange,
  rows = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "4px",
          fontSize: "11px",
          color: "var(--ei-text-soft)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {label}
      </label>
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  );
}

export function NextNodeRow({
  value,
  allNodes,
  currentKey,
  onChange,
  label,
}: {
  value: string;
  allNodes: BuilderNode[];
  currentKey: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "4px",
          fontSize: "11px",
          color: "var(--ei-text-soft)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {label}
      </label>
      <NodeKeySelect
        value={value || null}
        nodes={allNodes}
        excludeKey={currentKey}
        onChange={(v) => onChange(v ?? "")}
        placeholder="Pick a next node…"
      />
    </div>
  );
}

export function NodeKeySelect({
  value,
  nodes,
  excludeKey,
  onChange,
  placeholder,
  className,
}: {
  value: string | null;
  nodes: BuilderNode[];
  excludeKey?: string;
  onChange: (v: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const options = nodes.filter((n) => n.node_key !== excludeKey);
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <SelectTrigger
        className={className}
        style={{
          background: "rgba(159,176,201,0.08)",
          border: "1px solid rgba(159,176,201,0.22)",
          color: "var(--ei-offwhite)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: "12px",
        }}
      >
        <SelectValue placeholder={placeholder ?? "—"} />
      </SelectTrigger>
      <SelectContent
        style={{
          background: "var(--ei-surface-card, #0E1C32)",
          border: "1px solid rgba(159,176,201,0.18)",
          color: "var(--ei-offwhite)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <SelectItem value="__none__">— None —</SelectItem>
        {options.map((n) => {
          const Icon = NODE_META[n.node_type].icon;
          return (
            <SelectItem key={n.node_key} value={n.node_key}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Icon
                  className={NODE_META[n.node_type].color}
                  style={{ width: "12px", height: "12px" }}
                />
                {n.node_key}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
