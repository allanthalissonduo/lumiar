'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { CustomField } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface CustomFieldsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomFieldsManager({
  open,
  onOpenChange,
}: CustomFieldsManagerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Campos personalizados</DialogTitle>
          <DialogDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Defina campos extras de contato (ex. CEP, fonte do lead). Aparecem em
            cada contato e na ação "Atualizar campo de contato" das automações.
          </DialogDescription>
        </DialogHeader>
        <CustomFieldsPanel />
      </DialogContent>
    </Dialog>
  );
}

export function CustomFieldsPanel() {
  const supabase = createClient();
  const { user, accountId } = useAuth();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data } = await supabase
      .from('custom_fields')
      .select('*')
      .order('field_name');
    setFields((data as CustomField[] | null) ?? []);
    setLoading(false);
  }, [supabase, accountId]);

  useEffect(() => {
    if (accountId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchFields();
    }
  }, [accountId, fetchFields]);

  function isDuplicate(name: string, exceptId?: string): boolean {
    const lower = name.toLowerCase();
    return fields.some(
      (f) => f.id !== exceptId && f.field_name.toLowerCase() === lower
    );
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    if (!accountId || !user) {
      toast.error('Seu perfil não está vinculado a uma conta.');
      return;
    }
    if (isDuplicate(name)) {
      toast.error(`Já existe um campo chamado "${name}".`);
      return;
    }

    setCreating(true);
    const { error } = await supabase.from('custom_fields').insert({
      field_name: name,
      field_type: 'text',
      user_id: user.id,
      account_id: accountId,
    });
    setCreating(false);

    if (error) {
      toast.error('Não foi possível criar o campo. Você pode não ter permissão.');
      return;
    }
    toast.success(`Campo "${name}" criado.`);
    setNewName('');
    await fetchFields();
  }

  async function handleRename(
    field: CustomField,
    nextName: string
  ): Promise<boolean> {
    const name = nextName.trim();
    if (!name || name === field.field_name) return true;
    if (isDuplicate(name, field.id)) {
      toast.error(`Já existe um campo chamado "${name}".`);
      return false;
    }
    setBusyId(field.id);
    const { error } = await supabase
      .from('custom_fields')
      .update({ field_name: name })
      .eq('id', field.id);
    setBusyId(null);
    if (error) {
      toast.error('Não foi possível renomear o campo.');
      return false;
    }
    await fetchFields();
    return true;
  }

  async function handleDelete(field: CustomField) {
    if (
      !window.confirm(
        `Excluir "${field.field_name}"? Os valores armazenados em todos os contatos também serão removidos. Essa ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    setBusyId(field.id);
    const { error } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', field.id);
    setBusyId(null);
    if (error) {
      toast.error('Não foi possível excluir o campo.');
      return;
    }
    toast.success(`Campo "${field.field_name}" excluído.`);
    await fetchFields();
  }

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="Nome do novo campo…"
          style={{ backgroundColor: "rgba(159,176,201,0.08)", border: "1px solid rgba(159,176,201,0.22)", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => { if (!creating && newName.trim()) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
        >
          {creating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Adicionar
        </button>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto rounded-md" style={{ border: "1px solid rgba(159,176,201,0.18)" }}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: "var(--ei-text-soft)" }}>
            <Loader2 className="size-4 animate-spin" />
            Carregando…
          </div>
        ) : fields.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Nenhum campo personalizado ainda.
          </p>
        ) : (
          <ul>
            {fields.map((field, idx) => (
              <FieldRow
                key={field.id}
                field={field}
                busy={busyId === field.id}
                onRename={handleRename}
                onDelete={handleDelete}
                isLast={idx === fields.length - 1}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  busy,
  onRename,
  onDelete,
  isLast,
}: {
  field: CustomField;
  busy: boolean;
  onRename: (field: CustomField, name: string) => Promise<boolean>;
  onDelete: (field: CustomField) => void;
  isLast: boolean;
}) {
  const [name, setName] = useState(field.field_name);

  async function commit() {
    if (name.trim() === field.field_name) {
      setName(field.field_name);
      return;
    }
    const ok = await onRename(field, name);
    if (!ok) setName(field.field_name);
  }

  return (
    <li
      className="flex items-center gap-2 px-3 py-2"
      style={isLast ? {} : { borderBottom: "1px solid rgba(159,176,201,0.12)" }}
    >
      <Input
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        aria-label={`Renomear ${field.field_name}`}
        className="h-8"
        style={{ border: "none", backgroundColor: "transparent", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => onDelete(field)}
        title="Excluir campo"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors"
        style={{ color: "var(--ei-text-soft)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </button>
    </li>
  );
}
