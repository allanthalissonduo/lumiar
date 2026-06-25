"use client";

/**
 * Linear-list flow editor.
 *
 * Renders the trigger panel, entry-node picker, and the per-node card
 * list. Header and validation panel are NOT owned here — they live
 * once in FlowEditorShell so they show in both views (lifted in PR 3
 * so canvas users can also save + see validator issues).
 *
 * State lives in the shared `useFlowEditor()` context — toggling
 * Canvas ⇄ List never loses edits, and a drag on the canvas updates
 * the same nodes the list view reads.
 *
 * What's still local: the `expanded` set (which cards are open) and
 * the scroll refs used when the validator's flashKey changes — those
 * are list-only and have no canvas analogue.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CircleAlert,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ValidationIssue } from "@/lib/flows/validate";
import {
  NODE_META,
  slugify,
  summarizeNode,
  type BuilderNode,
  type NodeType,
} from "./shared";
import { NodeConfigForm } from "./forms/node-config-form";
import { NodeKeySelect } from "./forms/fields";
import { IssueLine } from "./validation-panel";
import {
  useFlowEditor,
  type BuilderState,
} from "./flow-editor-state";

// ============================================================
// Local state shape — mirrors the DB but the configs are typed
// loosely (Record<string, unknown>) since each node_type carries a
// different shape. The sub-form components narrow as needed.
// ============================================================

// ============================================================
// Root component
// ============================================================

export function FlowBuilder() {
  const {
    state,
    setState,
    issues,
    flashKey,
    addNode: addNodeCtx,
    updateNode,
    updateNodeConfig,
    removeNode: removeNodeCtx,
  } = useFlowEditor();

  // List-only UI state: which cards are expanded + scroll refs for
  // jump-to-node. The flash itself is read from context (flashKey)
  // so canvas + list share the same source of truth.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(state.nodes.map((n) => n.node_key)),
  );
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Wrap addNode so the new node opens expanded in the list view
  // (matches the previous behaviour where adding always revealed the
  // new card so the user could start editing immediately).
  const addNode = useCallback(
    (type: NodeType) => {
      const key = addNodeCtx(type);
      setExpanded((prev) => new Set([...prev, key]));
    },
    [addNodeCtx],
  );

  const removeNode = useCallback(
    (key: string) => {
      removeNodeCtx(key);
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [removeNodeCtx],
  );

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const setNodeRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (el) nodeRefs.current.set(key, el);
      else nodeRefs.current.delete(key);
    },
    [],
  );

  // React to validator jumps via the shared flashKey. We DERIVE the
  // expanded-with-flash set (avoids the "setState inside effect"
  // smell of mutating `expanded` from a useEffect on flashKey), then
  // run a side-effect-only effect to scroll the row into view. The
  // flash class is rendered by NodeCard when its key matches
  // flashKey; the flash auto-clears in the context so no timer here.
  const expandedWithFlash = useMemo(() => {
    if (!flashKey || expanded.has(flashKey)) return expanded;
    return new Set([...expanded, flashKey]);
  }, [expanded, flashKey]);
  useEffect(() => {
    if (!flashKey) return;
    // requestAnimationFrame defers the scroll until after React has
    // committed any expand-induced layout shift.
    requestAnimationFrame(() => {
      const el = nodeRefs.current.get(flashKey);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [flashKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <TriggerPanel
        state={state}
        setState={setState}
        triggerIssues={issues.filter((i) => i.scope === "trigger")}
      />

      <EntryPicker state={state} setState={setState} />

      <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--ei-offwhite)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Nodes ({state.nodes.length})
          </h2>
          <AddNodeButton onAdd={addNode} />
        </div>

        {state.nodes.length === 0 ? (
          <div style={{
            borderRadius: "0.5rem",
            border: "1px dashed rgba(159,176,201,0.18)",
            background: "rgba(159,176,201,0.04)",
            padding: "2rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--ei-text-soft)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Add a <strong>Start</strong> node, then a <strong>Send buttons</strong>
            {" "}node, then a <strong>Handoff</strong> — that&apos;s the welcome-menu
            shape from the brief.
          </div>
        ) : (
          state.nodes.map((node) => (
            <NodeCard
              key={node.node_key}
              node={node}
              allNodes={state.nodes}
              expanded={expandedWithFlash.has(node.node_key)}
              isEntry={state.entry_node_id === node.node_key}
              isFlashed={flashKey === node.node_key}
              cardRef={setNodeRef(node.node_key)}
              issues={issues.filter(
                (i) => i.scope === "node" && i.node_key === node.node_key,
              )}
              onToggle={() => toggleExpanded(node.node_key)}
              onUpdate={(patch) => updateNode(node.node_key, patch)}
              onUpdateConfig={(patch) => updateNodeConfig(node.node_key, patch)}
              onRemove={() => removeNode(node.node_key)}
              onSetEntry={() =>
                setState((s) => ({ ...s, entry_node_id: node.node_key }))
              }
            />
          ))
        )}
      </section>
    </div>
  );
}


// ============================================================
// Keyword trigger input
// ============================================================

/**
 * Comma-separated keyword entry. Keeps a local draft string so the
 * comma (and trailing space) the user types survive until they're done
 * — parsing into the keywords array on every keystroke stripped the
 * trailing comma the instant it was typed, making it impossible to
 * start a second keyword (issue #234). We commit on blur / Enter, then
 * re-display the cleaned, rejoined form. Seeded once on mount; the
 * component unmounts/remounts when the trigger type changes, so the
 * seed stays in sync. Mirrors the automations builder's KeywordMatchConfig.
 */
function KeywordsInput({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}) {
  const [draft, setDraft] = useState(keywords.join(", "));

  function commit() {
    const parsed = draft
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    setDraft(parsed.join(", "));
    onChange(parsed);
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      placeholder="support, help, hi"
      style={{
        width: "100%",
        background: "rgba(159,176,201,0.08)",
        border: "1px solid rgba(159,176,201,0.22)",
        borderRadius: "0.375rem",
        padding: "0.375rem 0.75rem",
        fontSize: "0.875rem",
        color: "var(--ei-offwhite)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        outline: "none",
      }}
    />
  );
}

// ============================================================
// Trigger panel
// ============================================================

function TriggerPanel({
  state,
  setState,
  triggerIssues,
}: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
  triggerIssues: ValidationIssue[];
}) {
  return (
    <section style={{
      borderRadius: "0.5rem",
      border: "1px solid rgba(159,176,201,0.18)",
      background: "rgba(159,176,201,0.04)",
      padding: "1rem",
    }}>
      <h2 style={{
        marginBottom: "0.75rem",
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "var(--ei-offwhite)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>Trigger</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "0.75rem",
      }}>
        <div>
          <label style={{
            display: "block",
            marginBottom: "0.25rem",
            fontSize: "0.75rem",
            color: "var(--ei-text-soft)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>When…</label>
          <Select
            value={state.trigger_type}
            onValueChange={(v) =>
              setState((s) => ({
                ...s,
                trigger_type: v as BuilderState["trigger_type"],
                trigger_config:
                  v === "keyword" ? { keywords: [] } : v === "manual" ? {} : {},
              }))
            }
          >
            <SelectTrigger style={{ background: "rgba(159,176,201,0.08)", border: "1px solid rgba(159,176,201,0.22)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keyword">
                A message contains a keyword
              </SelectItem>
              <SelectItem value="first_inbound_message">
                Customer&apos;s first ever inbound message
              </SelectItem>
              <SelectItem value="manual">
                Manual only (no auto-trigger)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {state.trigger_type === "keyword" && (
          <div>
            <label style={{
              display: "block",
              marginBottom: "0.25rem",
              fontSize: "0.75rem",
              color: "var(--ei-text-soft)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              Keywords (comma-separated)
            </label>
            <KeywordsInput
              keywords={
                Array.isArray(state.trigger_config.keywords)
                  ? (state.trigger_config.keywords as string[])
                  : []
              }
              onChange={(keywords) =>
                setState((s) => ({
                  ...s,
                  trigger_config: { ...s.trigger_config, keywords },
                }))
              }
            />
          </div>
        )}
      </div>
      {triggerIssues.length > 0 && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {triggerIssues.map((i, ix) => (
            <IssueLine key={ix} issue={i} />
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Entry-node picker
// ============================================================

function EntryPicker({
  state,
  setState,
}: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
}) {
  if (state.nodes.length === 0) return null;
  return (
    <section style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      borderRadius: "0.5rem",
      border: "1px solid rgba(159,176,201,0.18)",
      background: "rgba(159,176,201,0.04)",
      padding: "0.75rem",
    }}>
      <CornerDownRight style={{ height: "1rem", width: "1rem", flexShrink: 0, color: "var(--ei-cobalt)" }} />
      <span style={{ fontSize: "0.75rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Entry node:</span>
      <NodeKeySelect
        value={state.entry_node_id}
        nodes={state.nodes}
        onChange={(key) =>
          setState((s) => ({ ...s, entry_node_id: key }))
        }
        placeholder="Pick the first node…"
        className="flex-1 max-w-xs"
      />
    </section>
  );
}

// ============================================================
// Node card — collapsed summary + expanded config form
// ============================================================

function NodeCard({
  node,
  allNodes,
  expanded,
  isEntry,
  isFlashed,
  cardRef,
  issues,
  onToggle,
  onUpdate,
  onUpdateConfig,
  onRemove,
  onSetEntry,
}: {
  node: BuilderNode;
  allNodes: BuilderNode[];
  expanded: boolean;
  isEntry: boolean;
  isFlashed: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  issues: ValidationIssue[];
  onToggle: () => void;
  onUpdate: (patch: Partial<BuilderNode>) => void;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  onSetEntry: () => void;
}) {
  const meta = NODE_META[node.node_type];
  const hasError = issues.some((i) => i.severity === "error");
  const preview = summarizeNode(node);

  const borderColor = hasError
    ? "rgba(239,68,68,0.4)"
    : isEntry
      ? "rgba(43,111,219,0.5)"
      : "rgba(159,176,201,0.18)";

  const boxShadow = isFlashed
    ? "0 0 0 2px var(--ei-cobalt), 0 0 0 4px var(--ei-abyssal)"
    : undefined;

  return (
    <div
      ref={cardRef}
      style={{
        borderRadius: "0.5rem",
        border: `1px solid ${borderColor}`,
        background: "rgba(159,176,201,0.04)",
        transition: "box-shadow 0.5s",
        boxShadow,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <meta.icon className={meta.color} style={{ height: "1rem", width: "1rem", flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--ei-offwhite)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {meta.label}
            </span>
            <code style={{
              borderRadius: "0.25rem",
              background: "rgba(159,176,201,0.08)",
              padding: "0.125rem 0.375rem",
              fontSize: "0.625rem",
              color: "var(--ei-text-soft)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {node.node_key}
            </code>
            {isEntry && (
              <Badge
                variant="outline"
                style={{
                  borderColor: "rgba(43,111,219,0.4)",
                  background: "rgba(43,111,219,0.1)",
                  fontSize: "0.625rem",
                  color: "var(--ei-cobalt)",
                }}
              >
                Entry
              </Badge>
            )}
          </div>
          {!expanded && preview && (
            <p style={{
              marginTop: "0.125rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.75rem",
              color: "var(--ei-text-soft)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {preview}
            </p>
          )}
        </div>
        {hasError && (
          <CircleAlert style={{ height: "0.875rem", width: "0.875rem", flexShrink: 0, color: "rgb(248,113,113)" }} />
        )}
        {expanded ? (
          <ChevronUp style={{ height: "1rem", width: "1rem", color: "var(--ei-text-soft)" }} />
        ) : (
          <ChevronDown style={{ height: "1rem", width: "1rem", color: "var(--ei-text-soft)" }} />
        )}
      </button>
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(159,176,201,0.18)", padding: "1rem" }}>
          <NodeConfigWithAdvanced
            node={node}
            allNodes={allNodes}
            onUpdate={onUpdate}
            onUpdateConfig={onUpdateConfig}
          />
          <div style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(159,176,201,0.18)",
            paddingTop: "0.75rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {!isEntry && (
                <button
                  type="button"
                  onClick={onSetEntry}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(159,176,201,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: "0.375rem",
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--ei-text-soft)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  Set as entry
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onRemove}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                e.currentTarget.style.color = "rgb(252,165,165)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgb(248,113,113)";
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                background: "transparent",
                border: "none",
                borderRadius: "0.375rem",
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                color: "rgb(248,113,113)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <Trash2 style={{ height: "0.875rem", width: "0.875rem" }} />
              Remove node
            </button>
          </div>
          {issues.length > 0 && (
            <div style={{
              marginTop: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              borderRadius: "0.375rem",
              background: "rgba(239,68,68,0.05)",
              padding: "0.5rem",
            }}>
              {issues.map((i, ix) => (
                <IssueLine key={ix} issue={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Per-node-type config form — wraps the extracted dispatcher with
// the list-view's "Show advanced" disclosure (which exposes the
// internal node_key for stable analytics, hidden by default).
// ============================================================

function NodeConfigWithAdvanced({
  node,
  allNodes,
  onUpdate,
  onUpdateConfig,
}: {
  node: BuilderNode;
  allNodes: BuilderNode[];
  onUpdate: (patch: Partial<BuilderNode>) => void;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasReplyIds =
    node.node_type === "send_buttons" || node.node_type === "send_list";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <NodeConfigForm
        node={node}
        allNodes={allNodes}
        showAdvanced={showAdvanced}
        onUpdateConfig={onUpdateConfig}
      />
      <div style={{ borderTop: "1px solid rgba(159,176,201,0.18)", paddingTop: "0.75rem" }}>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.75rem",
            color: "var(--ei-text-soft)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ei-offwhite)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ei-text-soft)"; }}
        >
          {showAdvanced ? (
            <ChevronUp style={{ height: "0.75rem", width: "0.75rem" }} />
          ) : (
            <ChevronDown style={{ height: "0.75rem", width: "0.75rem" }} />
          )}
          {showAdvanced ? "Hide" : "Show"} advanced
        </button>
        {showAdvanced && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.75rem",
                color: "var(--ei-text-soft)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                Node key (internal identifier — keep stable for analytics)
              </label>
              <input
                value={node.node_key}
                onChange={(e) =>
                  onUpdate({ node_key: slugify(e.target.value, node.node_key) })
                }
                style={{
                  width: "100%",
                  background: "rgba(159,176,201,0.08)",
                  border: "1px solid rgba(159,176,201,0.22)",
                  borderRadius: "0.375rem",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "var(--ei-offwhite)",
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none",
                }}
              />
            </div>
            {hasReplyIds && (
              <p style={{
                fontSize: "0.625rem",
                color: "var(--ei-text-soft)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                Reply IDs for each option are shown inline above. They&apos;re
                returned by WhatsApp when a customer taps; you usually don&apos;t
                need to touch them.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================
// Add-node menu
// ============================================================

function AddNodeButton({ onAdd }: { onAdd: (type: NodeType) => void }) {
  const types: NodeType[] = [
    "start",
    "send_buttons",
    "send_list",
    "send_message",
    "send_media",
    "collect_input",
    "condition",
    "set_tag",
    "handoff",
    "end",
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(159,176,201,0.14)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(159,176,201,0.04)"; }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          borderRadius: "0.375rem",
          border: "1px solid rgba(159,176,201,0.18)",
          background: "rgba(159,176,201,0.04)",
          padding: "0.375rem 0.75rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "var(--ei-offwhite)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        aria-label="Add node"
      >
        <Plus style={{ height: "0.875rem", width: "0.875rem" }} />
        Add node
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        style={{
          border: "1px solid rgba(159,176,201,0.18)",
          background: "var(--ei-surface-card, #0E1C32)",
        }}
      >
        {types.map((t) => {
          const meta = NODE_META[t];
          return (
            <DropdownMenuItem key={t} onClick={() => onAdd(t)}>
              <meta.icon className={meta.color} style={{ height: "0.875rem", width: "0.875rem" }} />
              {meta.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
