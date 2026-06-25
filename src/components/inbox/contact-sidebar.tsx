"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Contact, Deal, ContactNote, Tag } from "@/types";
import {
  Phone,
  Mail,
  Copy,
  Check,
  User,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface ContactSidebarProps {
  contact: Contact | null;
}

export function ContactSidebar({ contact }: ContactSidebarProps) {
  const { accountId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();

    // Fetch deals, notes, and tags in parallel
    const [dealsRes, notesRes, tagsRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, stage:pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_tags")
        .select("id, tag_id, tags(*)")
        .eq("contact_id", contact.id),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (tagsRes.data) {
      const mapped = tagsRes.data
        .filter((ct: Record<string, unknown>) => ct.tags)
        .map((ct: Record<string, unknown>) => ({
          ...(ct.tags as Tag),
          contact_tag_id: ct.id as string,
        }));
      setTags(mapped);
    }
  }, [contact]);

  // Load on contact change. setContactData/setTags run inside async
  // Supabase callbacks, not synchronously in the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContactData();
  }, [fetchContactData]);

  const handleCopyPhone = useCallback(async () => {
    if (!contact?.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Dep is the whole `contact` object (not `contact?.phone`) so the
    // React Compiler's inference agrees with the manual dep list —
    // fixes the `preserve-manual-memoization` lint error.
  }, [contact]);

  const handleAddNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return;
    if (!accountId) return;
    setAddingNote(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    const { data, error } = await supabase
      .from("contact_notes")
      .insert({
        contact_id: contact.id,
        account_id: accountId,
        user_id: user?.id,
        note_text: newNote.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  }, [contact, newNote, accountId]);

  if (!contact) {
    return (
      <div className="flex h-full w-70 items-center justify-center" style={{ borderLeft: "1px solid rgba(159,176,201,0.18)", backgroundColor: "var(--ei-surface-card)" }}>
        <p className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Selecione uma conversa</p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const initials = displayName.charAt(0).toUpperCase();

  const divider = <div className="my-4" style={{ borderTop: "1px solid rgba(159,176,201,0.12)" }} />;
  const sectionLabel = (icon: React.ReactNode, label: string) => (
    <div className="flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
      {icon}{label}
    </div>
  );

  return (
    <div className="flex h-full w-70 flex-col" style={{ borderLeft: "1px solid rgba(159,176,201,0.18)", backgroundColor: "var(--ei-surface-card)" }}>
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Contact Info */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold" style={{ backgroundColor: "rgba(43,111,219,0.14)", color: "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {contact.avatar_url ? (
                <img src={contact.avatar_url} alt={displayName} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <h3 className="mt-3 text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {displayName}
            </h3>
            {contact.company && (
              <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{contact.company}</p>
            )}
          </div>

          {/* Phone */}
          <div className="mt-4 space-y-1">
            <button
              onClick={handleCopyPhone}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
            >
              <Phone className="h-4 w-4 shrink-0" style={{ color: "var(--ei-text-soft)" }} />
              <span className="flex-1 text-left">{contact.phone}</span>
              {copied
                ? <Check className="h-3 w-3" style={{ color: "var(--ei-iris)" }} />
                : <Copy className="h-3 w-3" style={{ color: "var(--ei-text-soft)" }} />}
            </button>

            {contact.email && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <Mail className="h-4 w-4 shrink-0" style={{ color: "var(--ei-text-soft)" }} />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </div>

          {divider}

          {/* Tags */}
          <div>
            {sectionLabel(<TagIcon className="h-3 w-3" />, "Tags")}
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.length === 0 ? (
                <p className="px-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sem tags</p>
              ) : (
                tags.map((tag) => (
                  <span key={tag.contact_tag_id} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                    {tag.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {divider}

          {/* Active Deals */}
          <div>
            {sectionLabel(<DollarSign className="h-3 w-3" />, "Negócios")}
            <div className="mt-2 space-y-2">
              {deals.length === 0 ? (
                <p className="px-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sem negócios</p>
              ) : (
                deals.map((deal) => (
                  <div key={deal.id} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.12)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {deal.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>{deal.currency ?? "R$"}{deal.value.toLocaleString()}</span>
                      {deal.stage && (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: `${deal.stage.color}20`, color: deal.stage.color }}>
                          {deal.stage.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {divider}

          {/* Notes */}
          <div>
            {sectionLabel(<StickyNote className="h-3 w-3" />, "Notas")}
            <div className="mt-2">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Adicionar nota…"
                  rows={2}
                  className="flex-1 resize-none rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    backgroundColor: "rgba(159,176,201,0.06)",
                    border: "1px solid rgba(159,176,201,0.18)",
                    color: "var(--ei-offwhite)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                />
                <Button
                  size="sm"
                  className="h-auto px-2"
                  style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff" } as React.CSSProperties}
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="mt-2 space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.10)" }}>
                    <p className="whitespace-pre-wrap text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {note.note_text}
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace", opacity: 0.7 }}>
                      {format(new Date(note.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
