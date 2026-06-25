"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES } from "@/lib/currency";
import type {
  Contact,
  Conversation,
  Deal,
  DealStatus,
  PipelineStage,
  Profile,
} from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Check,
  X,
  Trash2,
  MessageSquare,
  DollarSign,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: "none",
};

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
  onSaved: () => void;
}

export function DealForm({
  open,
  onOpenChange,
  deal,
  pipelineId,
  stages,
  defaultStageId,
  onSaved,
}: DealFormProps) {
  const supabase = createClient();
  const { accountId, defaultCurrency } = useAuth();

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [contactId, setContactId] = useState("");
  const [stageId, setStageId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [linkedConversation, setLinkedConversation] =
    useState<Conversation | null>(null);

  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<DealStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset the form fields every time the sheet opens or its input
  // props change. This is a legitimate prop-driven sync; the rule is
  // over-cautious here, hence the block-level disable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (deal) {
      setTitle(deal.title);
      setValue(String(deal.value ?? ""));
      setCurrency(deal.currency || defaultCurrency);
      // contact_id is nullable when the contact has been deleted
      // (migration 004: ON DELETE SET NULL). "" means "no selection".
      setContactId(deal.contact_id ?? "");
      setStageId(deal.stage_id);
      setAssignedTo(deal.assigned_to ?? "");
      setExpectedCloseDate(deal.expected_close_date ?? "");
      setNotes(deal.notes ?? "");
    } else {
      setTitle("");
      setValue("");
      setCurrency(defaultCurrency);
      setContactId("");
      setStageId(defaultStageId || stages[0]?.id || "");
      setAssignedTo("");
      setExpectedCloseDate("");
      setNotes("");
    }
  }, [open, deal, defaultStageId, stages, defaultCurrency]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load supporting data once the sheet is open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("contacts").select("*").order("name"),
        supabase.from("profiles").select("*").order("full_name"),
      ]);
      if (cancelled) return;
      setContacts((c.data ?? []) as Contact[]);
      setProfiles((p.data ?? []) as Profile[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  // Fetch linked conversation for the selected contact (newest open one).
  // Clearing on no-selection is sync with prop state; the populated
  // case runs setLinkedConversation inside the async fetch callback.
  useEffect(() => {
    if (!open || !contactId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkedConversation(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contactId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setLinkedConversation((data as Conversation | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, contactId, supabase]);

  async function handleSave() {
    if (!title.trim() || !contactId || !stageId) {
      toast.error("Title, contact, and stage are required");
      return;
    }
    setSaving(true);

    const payload = {
      title: title.trim(),
      value: parseFloat(value) || 0,
      currency,
      contact_id: contactId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      assigned_to: assignedTo || null,
      notes: notes.trim() || null,
      expected_close_date: expectedCloseDate || null,
    };

    if (deal) {
      const { error } = await supabase
        .from("deals")
        .update(payload)
        .eq("id", deal.id);
      if (error) {
        toast.error("Failed to save deal");
        setSaving(false);
        return;
      }
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        toast.error("Not signed in");
        setSaving(false);
        return;
      }
      if (!accountId) {
        toast.error("Your profile is not linked to an account.");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("deals")
        .insert({ ...payload, user_id: user.id, account_id: accountId, status: "open" });
      if (error) {
        toast.error("Failed to create deal");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success(deal ? "Deal updated" : "Deal created");
    onOpenChange(false);
    onSaved();
  }

  async function handleStatusChange(status: DealStatus) {
    if (!deal) return;
    setStatusAction(status);
    const { error } = await supabase
      .from("deals")
      .update({ status })
      .eq("id", deal.id);
    setStatusAction(null);
    if (error) {
      toast.error("Failed to update deal status");
      return;
    }
    toast.success(
      status === "won" ? "Marked as won" : status === "lost" ? "Marked as lost" : "Deal reopened",
    );
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!deal) return;
    setDeleting(true);
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    setDeleting(false);
    if (error) {
      toast.error("Failed to delete deal");
      return;
    }
    toast.success("Deal deleted");
    setConfirmDelete(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{
          backgroundColor: "var(--ei-abyssal)",
          borderLeft: "1px solid rgba(159,176,201,0.18)",
          color: "var(--ei-offwhite)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          maxWidth: "32rem",
          width: "100%",
          padding: 0,
        }}
      >
        <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
          <SheetHeader
            style={{
              borderBottom: "1px solid rgba(159,176,201,0.12)",
              padding: "1rem",
            }}
          >
            <SheetTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {deal ? "Edit Deal" : "New Deal"}
            </SheetTitle>
          </SheetHeader>

          <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Deal title"
                style={{ ...inputStyle, height: "2.25rem", borderRadius: "0.5rem", padding: "0 0.625rem", fontSize: "0.875rem", width: "100%" }}
              />
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Contact</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                style={{ ...inputStyle, height: "2.25rem", borderRadius: "0.5rem", padding: "0 0.625rem", fontSize: "0.875rem", width: "100%" }}
              >
                <option value="">Select a contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.phone}
                  </option>
                ))}
              </select>

              {linkedConversation && (
                <Link
                  href="/inbox"
                  style={{
                    marginTop: "0.25rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    alignSelf: "flex-start",
                    borderRadius: "0.375rem",
                    backgroundColor: "rgba(43,111,219,0.12)",
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--ei-cobalt)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(43,111,219,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(43,111,219,0.12)"; }}
                >
                  <MessageSquare style={{ height: "0.75rem", width: "0.75rem" }} />
                  Link to Conversation
                </Link>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: "0.75rem" }}>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.875rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Value</label>
                <div style={{ position: "relative" }}>
                  <DollarSign style={{ position: "absolute", left: "0.5rem", top: "50%", height: "0.875rem", width: "0.875rem", transform: "translateY(-50%)", color: "var(--ei-text-soft)" }} />
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                    style={{ ...inputStyle, height: "2.25rem", borderRadius: "0.5rem", paddingLeft: "1.75rem", paddingRight: "0.625rem", fontSize: "0.875rem", width: "100%" }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.875rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ ...inputStyle, height: "2.25rem", borderRadius: "0.5rem", padding: "0 0.625rem", fontSize: "0.875rem", width: "100%" }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Expected Close Date</label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                style={{ ...inputStyle, height: "2.25rem", borderRadius: "0.5rem", padding: "0 0.625rem", fontSize: "0.875rem", width: "100%" }}
              />
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Stage</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                style={{ ...inputStyle, height: "2.25rem", borderRadius: "0.5rem", padding: "0 0.625rem", fontSize: "0.875rem", width: "100%" }}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Assigned To</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{ ...inputStyle, height: "2.25rem", borderRadius: "0.5rem", padding: "0 0.625rem", fontSize: "0.875rem", width: "100%" }}
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                style={{ ...inputStyle, minHeight: "6.25rem", borderRadius: "0.5rem", padding: "0.5rem 0.625rem", fontSize: "0.875rem", width: "100%", resize: "vertical" }}
              />
            </div>

            {deal && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderRadius: "0.5rem", border: "1px solid rgba(159,176,201,0.18)", backgroundColor: "rgba(159,176,201,0.04)", padding: "0.75rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ei-text-soft)" }}>
                  Status
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("won")}
                    disabled={!!statusAction || deal.status === "won"}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                      height: "2.25rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      backgroundColor: "var(--ei-cobalt)",
                      color: "var(--ei-offwhite)",
                      fontSize: "0.875rem",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      cursor: "pointer",
                      opacity: (!!statusAction || deal.status === "won") ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "var(--ei-royal)"; }}
                    onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "var(--ei-cobalt)"; }}
                  >
                    {statusAction === "won" ? (
                      <Loader2 style={{ height: "1rem", width: "1rem" }} className="animate-spin" />
                    ) : (
                      <>
                        <Check style={{ marginRight: "0.25rem", height: "1rem", width: "1rem" }} />
                        Mark as Won
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("lost")}
                    disabled={!!statusAction || deal.status === "lost"}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                      height: "2.25rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      backgroundColor: "#dc2626",
                      color: "#fff",
                      fontSize: "0.875rem",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      cursor: "pointer",
                      opacity: (!!statusAction || deal.status === "lost") ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "#b91c1c"; }}
                    onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "#dc2626"; }}
                  >
                    {statusAction === "lost" ? (
                      <Loader2 style={{ height: "1rem", width: "1rem" }} className="animate-spin" />
                    ) : (
                      <>
                        <X style={{ marginRight: "0.25rem", height: "1rem", width: "1rem" }} />
                        Mark as Lost
                      </>
                    )}
                  </button>
                </div>
                {deal.status && deal.status !== "open" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("open")}
                    disabled={!!statusAction}
                    style={{
                      width: "100%",
                      height: "2.25rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      backgroundColor: "transparent",
                      color: "var(--ei-text-soft)",
                      fontSize: "0.875rem",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ei-offwhite)"; e.currentTarget.style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ei-text-soft)"; e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    Reopen deal
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(159,176,201,0.12)", backgroundColor: "rgba(10,22,40,0.8)", padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                style={{
                  flex: 1,
                  height: "2.25rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(159,176,201,0.22)",
                  backgroundColor: "transparent",
                  color: "var(--ei-text-soft)",
                  fontSize: "0.875rem",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !title.trim() || !contactId || !stageId}
                style={{
                  flex: 1,
                  height: "2.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  backgroundColor: "var(--ei-cobalt)",
                  color: "var(--ei-offwhite)",
                  fontSize: "0.875rem",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: "pointer",
                  opacity: (saving || !title.trim() || !contactId || !stageId) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "var(--ei-royal)"; }}
                onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "var(--ei-cobalt)"; }}
              >
                {saving ? "Saving..." : deal ? "Save Changes" : "Create Deal"}
              </button>
            </div>

            {deal &&
              (confirmDelete ? (
                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", borderRadius: "0.375rem", border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.1)", padding: "0.5rem 0.75rem", fontSize: "0.75rem" }}>
                  <span style={{ color: "#fca5a5" }}>Delete this deal?</span>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      style={{
                        borderRadius: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--ei-text-soft)",
                        fontSize: "0.75rem",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        borderRadius: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        border: "none",
                        backgroundColor: "#dc2626",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        cursor: "pointer",
                        opacity: deleting ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "#b91c1c"; }}
                      onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "#dc2626"; }}
                    >
                      {deleting ? "Deleting..." : "Confirm"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    marginTop: "0.75rem",
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.25rem",
                    border: "none",
                    backgroundColor: "transparent",
                    fontSize: "0.75rem",
                    color: "#f87171",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fca5a5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#f87171"; }}
                >
                  <Trash2 style={{ height: "0.75rem", width: "0.75rem" }} />
                  Delete Deal
                </button>
              ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
