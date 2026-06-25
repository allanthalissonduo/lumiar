'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Tag as TagIcon, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Tag } from '@/types';

const PRESET_COLORS = [
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Âmbar', value: '#f59e0b' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
];

export function TagManager() {
  const supabase = createClient();
  const { user, accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[3].value);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchTags(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  async function fetchTags(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      toast.error('Falha ao carregar tags');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTagName.trim()) {
      toast.error('Nome da tag é obrigatório');
      return;
    }

    try {
      setSaving(true);
      if (!user || !accountId) {
        toast.error('Não autenticado');
        return;
      }

      const { error } = await supabase.from('tags').insert({
        user_id: user.id,
        account_id: accountId,
        name: newTagName.trim(),
        color: selectedColor,
      });

      if (error) throw error;

      toast.success('Tag criada');
      setNewTagName('');
      setSelectedColor(PRESET_COLORS[3].value);
      await fetchTags(user.id);
    } catch (err) {
      console.error('Create error:', err);
      toast.error('Falha ao criar tag');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(tag: Tag) {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!tagToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagToDelete.id);

      if (error) throw error;

      toast.success('Tag excluída');
      setTags((prev) => prev.filter((t) => t.id !== tagToDelete.id));
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Falha ao excluir tag');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", padding: "20px" }}>
      <div className="flex items-center gap-2 mb-1">
        <TagIcon className="size-4" style={{ color: "var(--ei-cobalt)" }} />
        <p className="font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tags</p>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Rótulos coloridos para agrupar e filtrar contatos.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
        </div>
      ) : (
        <div className="space-y-4">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => confirmDelete(tag)}
                    aria-label={`Excluir ${tag.name}`}
                    className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(0,0,0,0.15)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nenhuma tag ainda — crie a primeira abaixo.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <Input
              placeholder="ex. Newsletter"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              disabled={saving}
              maxLength={40}
              className="min-w-[180px] flex-1"
              style={{
                backgroundColor: "rgba(159,176,201,0.08)",
                border: "1px solid rgba(159,176,201,0.22)",
                color: "var(--ei-offwhite)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            <div className="flex gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  aria-label={`Usar ${color.name}`}
                  aria-pressed={selectedColor === color.value}
                  className="size-6 rounded-md transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color.value,
                    outline: selectedColor === color.value ? `2px solid ${color.value}` : 'none',
                    outlineOffset: selectedColor === color.value ? '2px' : '0',
                  }}
                  title={color.name}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !newTagName.trim()}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!saving && newTagName.trim()) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar tag
            </button>
          </div>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm" style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Excluir tag</DialogTitle>
            <DialogDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Excluir a tag &quot;{tagToDelete?.name}&quot;? Isso a remove de todos os contatos e não pode ser desfeito.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#dc2626", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!deleting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#b91c1c"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#dc2626"; }}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir tag'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
