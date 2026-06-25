'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { Contact, Tag, ContactTag } from '@/types';
import {
  findExistingContact,
  isExactMatch,
  isUniqueViolation,
  type ExistingContact,
} from '@/lib/contacts/dedupe';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  contactTags?: ContactTag[];
  onSaved: () => void;
  /** Open an existing contact's detail view — used by the duplicate
   *  notice to jump to the contact that already owns this number. */
  onViewExisting?: (contactId: string) => void;
}

export function ContactForm({
  open,
  onOpenChange,
  contact,
  contactTags = [],
  onSaved,
  onViewExisting,
}: ContactFormProps) {
  const supabase = createClient();
  const { accountId } = useAuth();
  const isEdit = !!contact;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  const [dupMatch, setDupMatch] = useState<
    { contact: ExistingContact; exact: boolean } | null
  >(null);
  const [checkingDup, setCheckingDup] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? '');
      setPhone(contact?.phone ?? '');
      setEmail(contact?.email ?? '');
      setCompany(contact?.company ?? '');
      setSelectedTagIds(contactTags.map((ct) => ct.tag_id));
      setDupMatch(null);
      fetchTags();
    }
  }, [open, contact]);

  async function checkDuplicate() {
    if (isEdit || !accountId) return;
    const value = phone.trim();
    if (!value) {
      setDupMatch(null);
      return;
    }
    setCheckingDup(true);
    try {
      const existing = await findExistingContact(supabase, accountId, value);
      setDupMatch(
        existing
          ? { contact: existing, exact: isExactMatch(existing, value) }
          : null,
      );
    } finally {
      setCheckingDup(false);
    }
  }

  async function fetchTags() {
    setLoadingTags(true);
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    if (data) setTags(data);
    setLoadingTags(false);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error('Número de telefone é obrigatório');
      return;
    }

    if (!isEdit && dupMatch?.exact) {
      toast.error('Já existe um contato com este número de telefone');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      if (!accountId) throw new Error('Your profile is not linked to an account.');

      let contactId = contact?.id;

      if (isEdit && contactId) {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            user_id: user.id,
            account_id: accountId,
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
          })
          .select('id')
          .single();
        if (error) throw error;
        contactId = data.id;
      }

      if (contactId) {
        await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', contactId);

        if (selectedTagIds.length > 0) {
          const tagRows = selectedTagIds.map((tag_id) => ({
            contact_id: contactId!,
            tag_id,
          }));
          const { error: tagError } = await supabase
            .from('contact_tags')
            .insert(tagRows);
          if (tagError) throw tagError;
        }
      }

      toast.success(isEdit ? 'Contato atualizado' : 'Contato criado');
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        toast.error('Já existe um contato com este número de telefone');
        if (!isEdit && accountId) {
          const existing = await findExistingContact(
            supabase,
            accountId,
            phone.trim(),
          );
          if (existing) setDupMatch({ contact: existing, exact: true });
        }
        return;
      }
      const message = err instanceof Error ? err.message : 'Falha ao salvar contato';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "rgba(159,176,201,0.08)",
    border: "1px solid rgba(159,176,201,0.22)",
    color: "var(--ei-offwhite)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {isEdit ? 'Editar Contato' : 'Adicionar Contato'}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {isEdit
              ? 'Atualize os detalhes do contato abaixo.'
              : 'Preencha os detalhes para criar um novo contato.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-name" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nome
            </Label>
            <Input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" style={inputStyle} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-phone" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Telefone <span style={{ color: "#f87171" }}>*</span>
            </Label>
            <Input
              id="cf-phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (dupMatch) setDupMatch(null);
              }}
              onBlur={checkDuplicate}
              placeholder="+55 11 99999-9999"
              style={inputStyle}
            />
            {dupMatch ? (
              <div
                className="flex items-start gap-2 rounded-md px-2.5 py-2 text-xs"
                style={dupMatch.exact
                  ? { border: "1px solid rgba(248,113,113,0.40)", backgroundColor: "rgba(248,113,113,0.10)", color: "#fca5a5" }
                  : { border: "1px solid rgba(251,191,36,0.40)", backgroundColor: "rgba(251,191,36,0.10)", color: "#fcd34d" }}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div className="space-y-1">
                  <p>
                    {dupMatch.exact
                      ? 'Já existe um contato com este número de telefone.'
                      : 'Já existe um contato com um número muito parecido.'}
                  </p>
                  {onViewExisting && (
                    <button
                      type="button"
                      onClick={() => onViewExisting(dupMatch.contact.id)}
                      className="font-medium underline underline-offset-2 hover:no-underline"
                    >
                      Ver {dupMatch.contact.name || dupMatch.contact.phone}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Inclua o código do país, ex. +55 para Brasil
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-email" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Email
            </Label>
            <Input id="cf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@exemplo.com" style={inputStyle} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-company" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Empresa
            </Label>
            <Input id="cf-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Ltda." style={inputStyle} />
          </div>

          <div className="space-y-2">
            <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tags</Label>
            {loadingTags ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ei-text-soft)" }}>
                <Loader2 className="size-3 animate-spin" />
                Carregando tags...
              </div>
            ) : tags.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Nenhuma tag disponível. Crie tags nas Configurações.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer"
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                        border: selected ? `2px solid ${tag.color}` : `1px solid ${tag.color}40`,
                        opacity: selected ? 1 : 0.65,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || checkingDup || (!isEdit && !!dupMatch?.exact)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Atualizar' : 'Criar'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
