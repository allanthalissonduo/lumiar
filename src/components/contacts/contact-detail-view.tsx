'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import type { Contact, Tag, ContactNote, CustomField, Deal } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  Mail,
  Building2,
  Copy,
  Check,
  Loader2,
  Plus,
  Trash2,
  Save,
  DollarSign,
} from 'lucide-react';

interface ContactDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onUpdated: () => void;
}

export function ContactDetailView({
  open,
  onOpenChange,
  contactId,
  onUpdated,
}: ContactDetailViewProps) {
  const supabase = createClient();
  const { accountId, defaultCurrency } = useAuth();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [contactTagIds, setContactTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [savingCustom, setSavingCustom] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').eq('id', contactId).single();
    if (data) {
      setContact(data);
      setEditName(data.name ?? '');
      setEditPhone(data.phone);
      setEditEmail(data.email ?? '');
      setEditCompany(data.company ?? '');
    }
    setLoading(false);
  }, [contactId, supabase]);

  const fetchTags = useCallback(async () => {
    if (!contactId) return;
    const [tagsRes, contactTagsRes] = await Promise.all([
      supabase.from('tags').select('*').order('name'),
      supabase.from('contact_tags').select('tag_id').eq('contact_id', contactId),
    ]);
    if (tagsRes.data) setAllTags(tagsRes.data);
    if (contactTagsRes.data) setContactTagIds(contactTagsRes.data.map((ct) => ct.tag_id));
  }, [contactId, supabase]);

  const fetchNotes = useCallback(async () => {
    if (!contactId) return;
    setLoadingNotes(true);
    const { data } = await supabase
      .from('contact_notes').select('*').eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
    setLoadingNotes(false);
  }, [contactId, supabase]);

  const fetchCustomFields = useCallback(async () => {
    if (!contactId) return;
    setLoadingCustom(true);
    const [fieldsRes, valuesRes] = await Promise.all([
      supabase.from('custom_fields').select('*').order('field_name'),
      supabase.from('contact_custom_values').select('*').eq('contact_id', contactId),
    ]);
    if (fieldsRes.data) setCustomFields(fieldsRes.data);
    if (valuesRes.data) {
      const map: Record<string, string> = {};
      valuesRes.data.forEach((v) => { map[v.custom_field_id] = v.value ?? ''; });
      setCustomValues(map);
    }
    setLoadingCustom(false);
  }, [contactId, supabase]);

  const fetchDeals = useCallback(async () => {
    if (!contactId) return;
    setLoadingDeals(true);
    const { data } = await supabase
      .from('deals').select('*, stage:pipeline_stages(*)')
      .eq('contact_id', contactId).order('created_at', { ascending: false });
    setDeals((data ?? []) as Deal[]);
    setLoadingDeals(false);
  }, [contactId, supabase]);

  useEffect(() => {
    if (open && contactId) {
      fetchContact();
      fetchTags();
      fetchNotes();
      fetchCustomFields();
      fetchDeals();
    }
  }, [open, contactId, fetchContact, fetchTags, fetchNotes, fetchCustomFields, fetchDeals]);

  async function copyPhone() {
    if (!contact) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  async function saveDetails() {
    if (!contactId || !editPhone.trim()) {
      toast.error('Número de telefone é obrigatório');
      return;
    }
    setSavingDetails(true);
    const { error } = await supabase.from('contacts').update({
      name: editName.trim() || null,
      phone: editPhone.trim(),
      email: editEmail.trim() || null,
      company: editCompany.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', contactId);
    if (error) {
      toast.error('Falha ao atualizar contato');
    } else {
      toast.success('Contato atualizado');
      fetchContact();
      onUpdated();
    }
    setSavingDetails(false);
  }

  async function toggleTag(tagId: string) {
    if (!contactId) return;
    setSavingTags(true);
    const isSelected = contactTagIds.includes(tagId);
    if (isSelected) {
      const { error } = await supabase.from('contact_tags').delete()
        .eq('contact_id', contactId).eq('tag_id', tagId);
      if (!error) { setContactTagIds((prev) => prev.filter((id) => id !== tagId)); onUpdated(); }
    } else {
      const { error } = await supabase.from('contact_tags').insert({ contact_id: contactId, tag_id: tagId });
      if (!error) { setContactTagIds((prev) => [...prev, tagId]); onUpdated(); }
    }
    setSavingTags(false);
  }

  async function addNote() {
    if (!contactId || !newNote.trim()) return;
    setSavingNote(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !accountId) {
      toast.error('Não autenticado');
      setSavingNote(false);
      return;
    }
    const { error } = await supabase.from('contact_notes').insert({
      contact_id: contactId,
      account_id: accountId,
      user_id: user.id,
      note_text: newNote.trim(),
    });
    if (error) {
      toast.error('Falha ao adicionar nota');
    } else {
      setNewNote('');
      fetchNotes();
      toast.success('Nota adicionada');
    }
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    const { error } = await supabase.from('contact_notes').delete().eq('id', noteId);
    if (error) {
      toast.error('Falha ao excluir nota');
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success('Nota excluída');
    }
  }

  async function saveCustomFields() {
    if (!contactId) return;
    setSavingCustom(true);
    try {
      await supabase.from('contact_custom_values').delete().eq('contact_id', contactId);
      const rows = Object.entries(customValues)
        .filter(([, val]) => val.trim())
        .map(([fieldId, val]) => ({ contact_id: contactId, custom_field_id: fieldId, value: val.trim() }));
      if (rows.length > 0) {
        const { error } = await supabase.from('contact_custom_values').insert(rows);
        if (error) throw error;
      }
      toast.success('Campos personalizados salvos');
    } catch {
      toast.error('Falha ao salvar campos personalizados');
    }
    setSavingCustom(false);
  }

  function getInitials(name?: string | null) {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "rgba(159,176,201,0.08)",
    border: "1px solid rgba(159,176,201,0.22)",
    color: "var(--ei-offwhite)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    height: "2rem",
    fontSize: "0.875rem",
  };

  const saveBtn = (label: string, loading: boolean, icon: React.ReactNode, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-lg"
        style={{ backgroundColor: "#0d1e36", borderLeft: "1px solid rgba(43,111,219,0.30)" }}
      >
        {loading || !contact ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Header */}
            <SheetHeader className="p-4" style={{ borderBottom: "1px solid rgba(159,176,201,0.14)" }}>
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="text-sm font-medium" style={{ backgroundColor: "rgba(43,111,219,0.18)", color: "var(--ei-cobalt)" }}>
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="truncate">
                    {contact.name || 'Desconhecido'}
                  </SheetTitle>
                  <SheetDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="mt-0.5 text-xs">
                    Detalhes do contato
                  </SheetDescription>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--ei-text-soft)" }}>
                    <button
                      type="button"
                      onClick={copyPhone}
                      className="flex items-center gap-1 transition-colors"
                      style={{ color: "var(--ei-text-soft)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-cobalt)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
                    >
                      <Phone className="size-3" />
                      {contact.phone}
                      {copiedPhone ? (
                        <Check className="size-3" style={{ color: "var(--ei-iris)" }} />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
              <TabsList
                className="mx-4 mt-3"
                style={{ backgroundColor: "rgba(159,176,201,0.06)", borderBottom: "1px solid rgba(159,176,201,0.14)" }}
              >
                {["details","tags","notes","custom","deals"].map((tab) => {
                  const labels: Record<string, string> = { details: "Detalhes", tags: "Tags", notes: "Notas", custom: "Campos", deals: "Negócios" };
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.75rem" }}
                    >
                      {labels[tab]}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-3">
                  {[
                    { label: "Nome", value: editName, setter: setEditName, placeholder: "João Silva" },
                    { label: "Telefone *", value: editPhone, setter: setEditPhone, placeholder: "+55 11 99999-9999" },
                    { label: "Email", value: editEmail, setter: setEditEmail, placeholder: "joao@exemplo.com" },
                    { label: "Empresa", value: editCompany, setter: setEditCompany, placeholder: "Acme Ltda." },
                  ].map(({ label, value, setter, placeholder }) => (
                    <div key={label} className="space-y-1.5">
                      <Label className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</Label>
                      <Input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} style={inputStyle} />
                    </div>
                  ))}
                  {saveBtn("Salvar Alterações", savingDetails, <Save className="size-3.5" />, saveDetails)}
                </div>
              </TabsContent>

              {/* Tags Tab */}
              <TabsContent value="tags" className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Clique numa tag para adicionar ou remover deste contato.
                  </p>
                  {allTags.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Nenhuma tag disponível. Crie tags nas Configurações.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const selected = contactTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            disabled={savingTags}
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer"
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color,
                              border: selected ? `2px solid ${tag.color}` : `1px solid ${tag.color}40`,
                              opacity: selected ? 1 : 0.6,
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                          >
                            {selected && <Check className="size-3 mr-1" />}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="flex min-h-0 flex-1 flex-col px-4 py-3">
                <div className="mb-3 space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escreva uma nota..."
                    className="min-h-[60px] resize-none text-sm"
                    style={{ backgroundColor: "rgba(159,176,201,0.08)", border: "1px solid rgba(159,176,201,0.22)", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  />
                  {saveBtn("Adicionar Nota", savingNote, <Plus className="size-3.5" />, addNote)}
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {loadingNotes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-5 animate-spin" style={{ color: "var(--ei-text-soft)" }} />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="py-8 text-center text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Nenhuma nota ainda.
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="group rounded-lg p-3"
                        style={{ backgroundColor: "rgba(159,176,201,0.06)", border: "1px solid rgba(159,176,201,0.12)" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex-1 whitespace-pre-wrap text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {note.note_text}
                          </p>
                          <button
                            type="button"
                            onClick={() => deleteNote(note.id)}
                            className="shrink-0 opacity-0 transition-all group-hover:opacity-100"
                            style={{ color: "var(--ei-text-soft)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <p className="mt-1.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {new Date(note.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Custom Fields Tab */}
              <TabsContent value="custom" className="flex-1 overflow-y-auto px-4 py-3">
                {loadingCustom ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin" style={{ color: "var(--ei-text-soft)" }} />
                  </div>
                ) : customFields.length === 0 ? (
                  <p className="py-8 text-center text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Nenhum campo personalizado definido. Crie nas Configurações.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label className="text-xs capitalize" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {field.field_name}
                        </Label>
                        <Input
                          value={customValues[field.id] ?? ''}
                          onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={`Inserir ${field.field_name}...`}
                          style={inputStyle}
                        />
                      </div>
                    ))}
                    {saveBtn("Salvar Campos", savingCustom, <Save className="size-3.5" />, saveCustomFields)}
                  </div>
                )}
              </TabsContent>

              {/* Deals Tab */}
              <TabsContent value="deals" className="flex-1 overflow-y-auto px-4 py-3">
                {loadingDeals ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
                  </div>
                ) : deals.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Nenhum negócio ainda</p>
                ) : (
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="rounded-lg p-3"
                        style={{ border: "1px solid rgba(159,176,201,0.14)", backgroundColor: "rgba(159,176,201,0.06)" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {deal.title}
                          </p>
                          {deal.stage && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ backgroundColor: `${deal.stage.color}20`, color: deal.stage.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                              {deal.stage.name}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: "var(--ei-text-soft)" }}>
                          <span className="flex items-center gap-1">
                            <DollarSign className="size-3" />
                            {formatCurrency(deal.value ?? 0, deal.currency || defaultCurrency)}
                          </span>
                          {deal.status && deal.status !== 'open' && (
                            <span style={{ color: deal.status === 'won' ? "var(--ei-iris)" : "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {deal.status === 'won' ? 'Ganho' : 'Perdido'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
