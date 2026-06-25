"use client";

/**
 * Per-node configuration form, dispatched by node_type.
 *
 * One component, ten branches. Each branch renders the inputs that
 * map onto the node's `config` JSONB shape (text + buttons for
 * send_buttons, prompt + var_key for collect_input, etc.) and forwards
 * edits up via `onUpdateConfig`.
 *
 * Why this lives in src/components/flows/forms/ instead of next to
 * the list editor: PR 2 (canvas editing) needs to mount the same
 * form in a side panel when a user clicks a node on the canvas.
 * Keeping the per-node forms here means there's exactly one place
 * where each form's behaviour and validation lives — drift between
 * "what the list editor shows" and "what the canvas side panel
 * shows" becomes impossible.
 *
 * `showAdvanced` is the disclosure that surfaces internal
 * identifiers (node_key, button reply_id, list row reply_id) — owned
 * by the host (NodeCard / SideSheet) so the toggle is rendered
 * outside this form alongside whatever delete/cancel buttons that
 * host wants. The form just reads the boolean and conditionally
 * renders the advanced rows.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadAccountMedia, MEDIA_MAX_BYTES } from "@/lib/storage/upload-media";
import { slugify, type BuilderNode } from "../shared";
import { NextNodeRow, NodeKeySelect, TextRow } from "./fields";

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

const selectTriggerStyle: React.CSSProperties = {
  background: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
};

const selectContentStyle: React.CSSProperties = {
  background: "var(--ei-surface-card, #0E1C32)",
  border: "1px solid rgba(159,176,201,0.18)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "4px",
  fontSize: "11px",
  color: "var(--ei-text-soft)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

interface NodeConfigFormProps {
  node: BuilderNode;
  allNodes: BuilderNode[];
  showAdvanced: boolean;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
}

export function NodeConfigForm({
  node,
  allNodes,
  showAdvanced,
  onUpdateConfig,
}: NodeConfigFormProps) {
  const cfg = node.config;
  switch (node.node_type) {
    case "start":
      return (
        <NextNodeRow
          value={(cfg as { next_node_key?: string }).next_node_key ?? ""}
          allNodes={allNodes}
          currentKey={node.node_key}
          onChange={(v) => onUpdateConfig({ next_node_key: v })}
          label="Advances to"
        />
      );

    case "send_message":
      return (
        <>
          <TextRow
            label="Text sent to the customer"
            value={(cfg as { text?: string }).text ?? ""}
            onChange={(v) => onUpdateConfig({ text: v })}
          />
          <NextNodeRow
            value={(cfg as { next_node_key?: string }).next_node_key ?? ""}
            allNodes={allNodes}
            currentKey={node.node_key}
            onChange={(v) => onUpdateConfig({ next_node_key: v })}
            label="Advances to"
          />
        </>
      );

    case "send_buttons":
      return (
        <SendButtonsForm
          cfg={cfg as SendButtonsCfg}
          allNodes={allNodes}
          currentKey={node.node_key}
          onUpdateConfig={onUpdateConfig}
          showAdvanced={showAdvanced}
        />
      );

    case "send_list":
      return (
        <SendListForm
          cfg={cfg as SendListCfg}
          allNodes={allNodes}
          currentKey={node.node_key}
          onUpdateConfig={onUpdateConfig}
          showAdvanced={showAdvanced}
        />
      );

    case "send_media":
      return (
        <SendMediaForm
          cfg={cfg as SendMediaCfg}
          allNodes={allNodes}
          currentKey={node.node_key}
          onUpdateConfig={onUpdateConfig}
        />
      );

    case "collect_input":
      return (
        <>
          <TextRow
            label="Prompt sent to the customer"
            value={(cfg as { prompt_text?: string }).prompt_text ?? ""}
            onChange={(v) => onUpdateConfig({ prompt_text: v })}
            rows={2}
          />
          <div>
            <label style={labelStyle}>
              Variable key (stored in flow_runs.vars; alphanumeric + underscore)
            </label>
            <input
              value={(cfg as { var_key?: string }).var_key ?? ""}
              onChange={(e) =>
                onUpdateConfig({
                  var_key: e.target.value.replace(/[^a-zA-Z0-9_]/g, ""),
                })
              }
              placeholder="e.g. name, email, company"
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
            />
            <p
              style={{
                marginTop: "4px",
                fontSize: "10px",
                color: "var(--ei-text-soft)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Interpolate in downstream prompts and handoff notes with{" "}
              <code
                style={{
                  borderRadius: "3px",
                  background: "rgba(159,176,201,0.08)",
                  padding: "0 4px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {"{{vars."}
                {(cfg as { var_key?: string }).var_key || "name"}
                {"}}"}
              </code>
              .
            </p>
          </div>
          <NextNodeRow
            value={(cfg as { next_node_key?: string }).next_node_key ?? ""}
            allNodes={allNodes}
            currentKey={node.node_key}
            onChange={(v) => onUpdateConfig({ next_node_key: v })}
            label="After capturing, advance to"
          />
        </>
      );

    case "condition":
      return (
        <ConditionForm
          cfg={cfg as ConditionCfg}
          allNodes={allNodes}
          currentKey={node.node_key}
          onUpdateConfig={onUpdateConfig}
        />
      );

    case "set_tag":
      return (
        <SetTagForm
          cfg={cfg as SetTagCfg}
          allNodes={allNodes}
          currentKey={node.node_key}
          onUpdateConfig={onUpdateConfig}
        />
      );

    case "handoff":
      return (
        <TextRow
          label="Internal note (for the agent picking up)"
          value={(cfg as { note?: string }).note ?? ""}
          onChange={(v) => onUpdateConfig({ note: v })}
          rows={2}
        />
      );

    case "end":
      return (
        <p
          style={{
            fontSize: "12px",
            color: "var(--ei-text-soft)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Terminal node. When the runner reaches this node the run is marked
          complete. No config needed.
        </p>
      );
  }
}

// ============================================================
// send_buttons
// ============================================================

interface SendButtonsCfg {
  text?: string;
  footer_text?: string;
  buttons?: Array<{ reply_id: string; title: string; next_node_key: string }>;
}

function SendButtonsForm({
  cfg,
  allNodes,
  currentKey,
  onUpdateConfig,
  showAdvanced,
}: {
  cfg: SendButtonsCfg;
  allNodes: BuilderNode[];
  currentKey: string;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
  showAdvanced: boolean;
}) {
  const buttons = cfg.buttons ?? [];
  const updateButton = (
    idx: number,
    patch: Partial<NonNullable<SendButtonsCfg["buttons"]>[number]>,
  ) => {
    onUpdateConfig({
      buttons: buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    });
  };
  const addButton = () =>
    onUpdateConfig({
      buttons: [
        ...buttons,
        {
          reply_id: `btn_${buttons.length + 1}`,
          title: "Option",
          next_node_key: "",
        },
      ],
    });
  const removeButton = (idx: number) =>
    onUpdateConfig({ buttons: buttons.filter((_, i) => i !== idx) });

  return (
    <>
      <TextRow
        label="Body text"
        value={cfg.text ?? ""}
        onChange={(v) => onUpdateConfig({ text: v })}
        rows={3}
      />
      <TextRow
        label="Footer (optional, 60 chars)"
        value={cfg.footer_text ?? ""}
        onChange={(v) => onUpdateConfig({ footer_text: v })}
      />
      <div>
        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <label style={labelStyle}>
            Buttons (1–3) — each one routes to a different next node
          </label>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {buttons.map((b, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: showAdvanced
                  ? "1fr 2fr 2fr auto"
                  : "2fr 2fr auto",
                gap: "8px",
                borderRadius: "6px",
                border: "1px solid rgba(159,176,201,0.18)",
                background: "rgba(159,176,201,0.04)",
                padding: "12px",
              }}
            >
              {showAdvanced && (
                <input
                  value={b.reply_id}
                  onChange={(e) =>
                    updateButton(i, {
                      reply_id: slugify(e.target.value, `btn_${i + 1}`),
                    })
                  }
                  placeholder="reply_id"
                  style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                />
              )}
              <input
                value={b.title}
                onChange={(e) => updateButton(i, { title: e.target.value })}
                placeholder="Visible title (≤20 chars)"
                style={inputStyle}
                maxLength={20}
              />
              <NodeKeySelect
                value={b.next_node_key || null}
                nodes={allNodes}
                excludeKey={currentKey}
                onChange={(v) => updateButton(i, { next_node_key: v ?? "" })}
                placeholder="Next node…"
              />
              <IconButton
                onClick={() => removeButton(i)}
                danger
                aria-label="Remove button"
              >
                <Trash2 style={{ width: "14px", height: "14px" }} />
              </IconButton>
            </div>
          ))}
        </div>
        {buttons.length < 3 && (
          <GhostButton onClick={addButton} style={{ marginTop: "8px" }}>
            <Plus style={{ width: "14px", height: "14px" }} />
            Add button
          </GhostButton>
        )}
      </div>
    </>
  );
}

// ============================================================
// send_list
// ============================================================

interface SendListCfg {
  text?: string;
  button_label?: string;
  footer_text?: string;
  sections?: Array<{
    title?: string;
    rows: Array<{
      reply_id: string;
      title: string;
      description?: string;
      next_node_key: string;
    }>;
  }>;
}

function SendListForm({
  cfg,
  allNodes,
  currentKey,
  onUpdateConfig,
  showAdvanced,
}: {
  cfg: SendListCfg;
  allNodes: BuilderNode[];
  currentKey: string;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
  showAdvanced: boolean;
}) {
  const sections = cfg.sections ?? [];
  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);

  const updateSection = (
    sIdx: number,
    patch: Partial<NonNullable<SendListCfg["sections"]>[number]>,
  ) => {
    onUpdateConfig({
      sections: sections.map((s, i) =>
        i === sIdx ? { ...s, ...patch } : s,
      ),
    });
  };
  const addSection = () =>
    onUpdateConfig({
      sections: [
        ...sections,
        {
          title: "",
          rows: [
            {
              reply_id: `row_${totalRows + 1}`,
              title: `Option ${totalRows + 1}`,
              next_node_key: "",
            },
          ],
        },
      ],
    });
  const removeSection = (sIdx: number) =>
    onUpdateConfig({ sections: sections.filter((_, i) => i !== sIdx) });
  const updateRow = (
    sIdx: number,
    rIdx: number,
    patch: Partial<
      NonNullable<SendListCfg["sections"]>[number]["rows"][number]
    >,
  ) => {
    onUpdateConfig({
      sections: sections.map((s, i) =>
        i === sIdx
          ? {
              ...s,
              rows: s.rows.map((r, j) => (j === rIdx ? { ...r, ...patch } : r)),
            }
          : s,
      ),
    });
  };
  const addRow = (sIdx: number) =>
    onUpdateConfig({
      sections: sections.map((s, i) =>
        i === sIdx
          ? {
              ...s,
              rows: [
                ...s.rows,
                {
                  reply_id: `row_${totalRows + 1}`,
                  title: `Option ${totalRows + 1}`,
                  next_node_key: "",
                },
              ],
            }
          : s,
      ),
    });
  const removeRow = (sIdx: number, rIdx: number) =>
    onUpdateConfig({
      sections: sections.map((s, i) =>
        i === sIdx ? { ...s, rows: s.rows.filter((_, j) => j !== rIdx) } : s,
      ),
    });

  return (
    <>
      <TextRow
        label="Body text"
        value={cfg.text ?? ""}
        onChange={(v) => onUpdateConfig({ text: v })}
        rows={3}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        <TextRow
          label="Tap-to-expand button label (≤20 chars)"
          value={cfg.button_label ?? ""}
          onChange={(v) => onUpdateConfig({ button_label: v })}
        />
        <TextRow
          label="Footer (optional, 60 chars)"
          value={cfg.footer_text ?? ""}
          onChange={(v) => onUpdateConfig({ footer_text: v })}
        />
      </div>

      <div style={{ marginTop: "8px" }}>
        <label style={labelStyle}>
          Rows (1–10 total across all sections)
        </label>
        {sections.map((section, sIdx) => (
          <div
            key={sIdx}
            style={{
              marginBottom: "12px",
              borderRadius: "6px",
              border: "1px solid rgba(159,176,201,0.18)",
              background: "rgba(159,176,201,0.04)",
              padding: "12px",
            }}
          >
            <div
              style={{
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <input
                value={section.title ?? ""}
                onChange={(e) =>
                  updateSection(sIdx, { title: e.target.value })
                }
                placeholder={`Section ${sIdx + 1} title (optional)`}
                style={inputStyle}
              />
              {sections.length > 1 && (
                <IconButton
                  onClick={() => removeSection(sIdx)}
                  danger
                  aria-label="Remove section"
                  style={{ flexShrink: 0 }}
                >
                  <Trash2 style={{ width: "14px", height: "14px" }} />
                </IconButton>
              )}
            </div>
            {section.rows.map((row, rIdx) => (
              <div
                key={rIdx}
                style={{
                  marginBottom: "8px",
                  display: "grid",
                  gridTemplateColumns: showAdvanced
                    ? "1fr 2fr 2fr auto"
                    : "2fr 2fr auto",
                  gap: "8px",
                }}
              >
                {showAdvanced && (
                  <input
                    value={row.reply_id}
                    onChange={(e) =>
                      updateRow(sIdx, rIdx, {
                        reply_id: slugify(
                          e.target.value,
                          `row_${rIdx + 1}`,
                        ),
                      })
                    }
                    placeholder="reply_id"
                    style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                  />
                )}
                <input
                  value={row.title}
                  onChange={(e) =>
                    updateRow(sIdx, rIdx, { title: e.target.value })
                  }
                  placeholder="Row title (≤24)"
                  style={inputStyle}
                  maxLength={24}
                />
                <NodeKeySelect
                  value={row.next_node_key || null}
                  nodes={allNodes}
                  excludeKey={currentKey}
                  onChange={(v) =>
                    updateRow(sIdx, rIdx, { next_node_key: v ?? "" })
                  }
                  placeholder="Next node…"
                />
                <IconButton
                  onClick={() => removeRow(sIdx, rIdx)}
                  danger
                >
                  <Trash2 style={{ width: "14px", height: "14px" }} />
                </IconButton>
              </div>
            ))}
            {totalRows < 10 && (
              <GhostButton onClick={() => addRow(sIdx)} style={{ marginTop: "4px" }}>
                <Plus style={{ width: "14px", height: "14px" }} />
                Add row
              </GhostButton>
            )}
          </div>
        ))}
        {/* WhatsApp's interactive-list spec caps sections at 10. Group rows
            by category (Billing / Support / Sales etc.) to give customers a
            scannable menu. */}
        {sections.length < 10 && (
          <OutlineButton onClick={addSection}>
            <Plus style={{ width: "14px", height: "14px" }} />
            Add section
          </OutlineButton>
        )}
      </div>
    </>
  );
}

// ============================================================
// condition
// ============================================================

interface ConditionCfg {
  subject?: "var" | "tag" | "contact_field";
  subject_key?: string;
  operator?: "equals" | "contains" | "present" | "absent";
  value?: string;
  true_next?: string;
  false_next?: string;
}

interface UserTag {
  id: string;
  name: string;
  color?: string;
}

function ConditionForm({
  cfg,
  allNodes,
  currentKey,
  onUpdateConfig,
}: {
  cfg: ConditionCfg;
  allNodes: BuilderNode[];
  currentKey: string;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
}) {
  const tags = useUserTags();

  const subject = cfg.subject ?? "var";
  const operator = cfg.operator ?? "equals";
  const showValue = operator === "equals" || operator === "contains";

  return (
    <>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}
      >
        <div>
          <label style={labelStyle}>If</label>
          <Select
            value={subject}
            onValueChange={(v) =>
              onUpdateConfig({ subject: v as ConditionCfg["subject"] })
            }
          >
            <SelectTrigger style={selectTriggerStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={selectContentStyle}>
              <SelectItem value="var">Captured variable</SelectItem>
              <SelectItem value="tag">Contact has tag</SelectItem>
              <SelectItem value="contact_field">Contact field</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label style={labelStyle}>
            {subject === "var"
              ? "var name"
              : subject === "tag"
                ? "Tag"
                : "Field"}
          </label>
          {subject === "tag" && tags.length > 0 ? (
            <Select
              value={cfg.subject_key ?? ""}
              onValueChange={(v) => onUpdateConfig({ subject_key: v })}
            >
              <SelectTrigger style={selectTriggerStyle}>
                <SelectValue placeholder="Pick a tag…" />
              </SelectTrigger>
              <SelectContent style={selectContentStyle}>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : subject === "contact_field" ? (
            <Select
              value={cfg.subject_key ?? ""}
              onValueChange={(v) => onUpdateConfig({ subject_key: v })}
            >
              <SelectTrigger style={selectTriggerStyle}>
                <SelectValue placeholder="Pick a field…" />
              </SelectTrigger>
              <SelectContent style={selectContentStyle}>
                <SelectItem value="name">name</SelectItem>
                <SelectItem value="email">email</SelectItem>
                <SelectItem value="phone">phone</SelectItem>
                <SelectItem value="company">company</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <input
              value={cfg.subject_key ?? ""}
              onChange={(e) =>
                onUpdateConfig({ subject_key: e.target.value })
              }
              placeholder={subject === "var" ? "e.g. email" : "tag UUID"}
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: showValue ? "1fr 1fr" : "1fr",
          gap: "12px",
        }}
      >
        <div>
          <label style={labelStyle}>Operator</label>
          <Select
            value={operator}
            onValueChange={(v) =>
              onUpdateConfig({ operator: v as ConditionCfg["operator"] })
            }
          >
            <SelectTrigger style={selectTriggerStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={selectContentStyle}>
              <SelectItem value="present">is present</SelectItem>
              <SelectItem value="absent">is absent</SelectItem>
              <SelectItem value="equals">equals</SelectItem>
              <SelectItem value="contains">contains</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showValue && (
          <div>
            <label style={labelStyle}>Value</label>
            <input
              value={cfg.value ?? ""}
              onChange={(e) => onUpdateConfig({ value: e.target.value })}
              style={inputStyle}
            />
          </div>
        )}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <NextNodeRow
          value={cfg.true_next ?? ""}
          allNodes={allNodes}
          currentKey={currentKey}
          onChange={(v) => onUpdateConfig({ true_next: v })}
          label="If true → advance to"
        />
        <NextNodeRow
          value={cfg.false_next ?? ""}
          allNodes={allNodes}
          currentKey={currentKey}
          onChange={(v) => onUpdateConfig({ false_next: v })}
          label="If false → advance to"
        />
      </div>
    </>
  );
}

// ============================================================
// set_tag
// ============================================================

interface SetTagCfg {
  mode?: "add" | "remove";
  tag_id?: string;
  next_node_key?: string;
}

function SetTagForm({
  cfg,
  allNodes,
  currentKey,
  onUpdateConfig,
}: {
  cfg: SetTagCfg;
  allNodes: BuilderNode[];
  currentKey: string;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
}) {
  const tags = useUserTags();

  return (
    <>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <div>
          <label style={labelStyle}>Action</label>
          <Select
            value={cfg.mode ?? "add"}
            onValueChange={(v) =>
              onUpdateConfig({ mode: v as SetTagCfg["mode"] })
            }
          >
            <SelectTrigger style={selectTriggerStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={selectContentStyle}>
              <SelectItem value="add">Add tag</SelectItem>
              <SelectItem value="remove">Remove tag</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label style={labelStyle}>Tag</label>
          {tags.length > 0 ? (
            <Select
              value={cfg.tag_id ?? ""}
              onValueChange={(v) => onUpdateConfig({ tag_id: v })}
            >
              <SelectTrigger style={selectTriggerStyle}>
                <SelectValue placeholder="Pick a tag…" />
              </SelectTrigger>
              <SelectContent style={selectContentStyle}>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <input
              value={cfg.tag_id ?? ""}
              onChange={(e) => onUpdateConfig({ tag_id: e.target.value })}
              placeholder="Tag UUID"
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
            />
          )}
        </div>
      </div>
      <NextNodeRow
        value={cfg.next_node_key ?? ""}
        allNodes={allNodes}
        currentKey={currentKey}
        onChange={(v) => onUpdateConfig({ next_node_key: v })}
        label="Then advance to"
      />
    </>
  );
}

/**
 * Shared loader for both `condition` (subject=tag) and `set_tag`.
 * Falls back to raw UUID input if the endpoint is absent on older
 * deployments — the form remains authorable in that case.
 */
function useUserTags(): UserTag[] {
  const [tags, setTags] = useState<UserTag[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tags").catch(() => null);
        if (!res || !res.ok) return;
        const json = (await res.json()) as { tags?: UserTag[] };
        if (!cancelled) setTags(json.tags ?? []);
      } catch {
        // Tags endpoint absent — caller falls back to raw input.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return tags;
}

// ============================================================
// send_media
// ============================================================

interface SendMediaCfg {
  media_type?: "image" | "video" | "document";
  media_url?: string;
  caption?: string;
  filename?: string;
  next_node_key?: string;
}

// Mirrors the bucket's allowed_mime_types from migration 016. Kept in
// sync with the storage policy so the picker rejects unsupported files
// before they hit the network rather than failing with a confusing
// Supabase RLS / mime-type error.
const MEDIA_ACCEPT: Record<NonNullable<SendMediaCfg["media_type"]>, string> = {
  image: "image/png,image/jpeg,image/webp",
  video: "video/mp4,video/3gpp",
  document:
    "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain",
};

const FLOW_MEDIA_BUCKET = "flow-media";

function SendMediaForm({
  cfg,
  allNodes,
  currentKey,
  onUpdateConfig,
}: {
  cfg: SendMediaCfg;
  allNodes: BuilderNode[];
  currentKey: string;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const mediaType = cfg.media_type ?? "image";
  const isDocument = mediaType === "document";
  const displayName =
    cfg.filename ||
    (cfg.media_url ? cfg.media_url.split("/").pop() ?? "" : "");

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MEDIA_MAX_BYTES) {
        toast.error(
          `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — limit is 16 MB.`,
        );
        return;
      }
      setUploading(true);
      try {
        // Account-scoped upload (path `account-<id>/...`) — see
        // uploadAccountMedia + migration 020's flow-media RLS policy.
        const { publicUrl } = await uploadAccountMedia(FLOW_MEDIA_BUCKET, file);
        // Patch all fields in one call so the form doesn't re-render
        // with a half-uploaded state.
        onUpdateConfig({
          media_url: publicUrl,
          filename: file.name,
        });
        toast.success("File uploaded.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed.";
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [onUpdateConfig],
  );

  const handleClear = () => {
    onUpdateConfig({ media_url: "", filename: "" });
  };

  return (
    <>
      <div>
        <label style={labelStyle}>Media type</label>
        <Select
          value={mediaType}
          onValueChange={(v) => {
            // Changing type clears the existing file — the bucket
            // accepts different MIME sets per type and a previously
            // uploaded PDF can't be sent as an image.
            onUpdateConfig({
              media_type: v as NonNullable<SendMediaCfg["media_type"]>,
              media_url: "",
              filename: "",
            });
          }}
        >
          <SelectTrigger style={selectTriggerStyle}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={selectContentStyle}>
            <SelectItem value="image">Image (PNG, JPEG, WebP)</SelectItem>
            <SelectItem value="video">Video (MP4, 3GP)</SelectItem>
            <SelectItem value="document">
              Document (PDF, Word, Excel, PowerPoint, TXT)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label style={labelStyle}>File</label>
        {cfg.media_url ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "6px",
              border: "1px solid rgba(159,176,201,0.22)",
              background: "rgba(159,176,201,0.08)",
              padding: "8px 12px",
              fontSize: "12px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <Paperclip
              style={{ width: "14px", height: "14px", flexShrink: 0, color: "#22d3ee" }}
            />
            <a
              href={cfg.media_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                minWidth: 0,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "var(--ei-offwhite)",
                textDecoration: "none",
              }}
              title={displayName || cfg.media_url}
            >
              {displayName || cfg.media_url}
            </a>
            <button
              type="button"
              onClick={handleClear}
              style={{
                borderRadius: "4px",
                padding: "4px",
                background: "none",
                border: "none",
                color: "var(--ei-text-soft)",
                cursor: "pointer",
              }}
              aria-label="Remove file"
              disabled={uploading}
            >
              <X style={{ width: "14px", height: "14px" }} />
            </button>
          </div>
        ) : (
          <UploadDropzone
            uploading={uploading}
            onClick={() => fileInputRef.current?.click()}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={MEDIA_ACCEPT[mediaType]}
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            // Reset so picking the same file twice still fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      <TextRow
        label="Caption (optional, shown under the media)"
        value={cfg.caption ?? ""}
        onChange={(v) => onUpdateConfig({ caption: v })}
        rows={2}
      />

      {isDocument && (
        <div>
          <label style={labelStyle}>
            Filename shown to the customer (documents only)
          </label>
          <input
            value={cfg.filename ?? ""}
            onChange={(e) => onUpdateConfig({ filename: e.target.value })}
            placeholder="invoice.pdf"
            style={inputStyle}
          />
        </div>
      )}

      <NextNodeRow
        value={cfg.next_node_key ?? ""}
        allNodes={allNodes}
        currentKey={currentKey}
        onChange={(v) => onUpdateConfig({ next_node_key: v })}
        label="After sending, advance to"
      />
    </>
  );
}

// ============================================================
// Small inline UI primitives (no Shadcn)
// ============================================================

function UploadDropzone({
  uploading,
  onClick,
}: {
  uploading: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uploading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        borderRadius: "6px",
        border: `1px dashed ${hovered ? "rgba(159,176,201,0.35)" : "rgba(159,176,201,0.22)"}`,
        background: hovered ? "rgba(159,176,201,0.08)" : "rgba(159,176,201,0.04)",
        padding: "16px 12px",
        fontSize: "12px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: hovered ? "var(--ei-offwhite)" : "var(--ei-text-soft)",
        cursor: uploading ? "not-allowed" : "pointer",
        opacity: uploading ? 0.6 : 1,
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        boxSizing: "border-box",
      }}
    >
      {uploading ? (
        <>
          <Loader2
            style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }}
          />
          Uploading…
        </>
      ) : (
        <>
          <Upload style={{ width: "14px", height: "14px" }} />
          Click to upload (max 16 MB)
        </>
      )}
    </button>
  );
}

function IconButton({
  onClick,
  danger,
  children,
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  danger?: boolean;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px",
        borderRadius: "6px",
        border: "none",
        background: danger && hovered ? "rgba(239,68,68,0.1)" : "none",
        color: danger ? (hovered ? "#fca5a5" : "#f87171") : "var(--ei-text-soft)",
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

function GhostButton({
  onClick,
  children,
  style,
}: {
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 10px",
        borderRadius: "6px",
        border: "none",
        background: hovered ? "rgba(159,176,201,0.08)" : "none",
        color: hovered ? "var(--ei-offwhite)" : "var(--ei-text-soft)",
        fontSize: "12px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function OutlineButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 12px",
        borderRadius: "6px",
        border: `1px solid ${hovered ? "rgba(159,176,201,0.35)" : "rgba(159,176,201,0.22)"}`,
        background: hovered ? "rgba(159,176,201,0.08)" : "none",
        color: hovered ? "var(--ei-offwhite)" : "var(--ei-text-soft)",
        fontSize: "12px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
      }}
    >
      {children}
    </button>
  );
}
