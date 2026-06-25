'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  Pencil,
  RotateCcw,
  Upload,
  ImageIcon,
  FileText,
  Video,
  Phone,
  Link2,
  Copy,
  CheckCheck,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  uploadAccountMedia,
  MEDIA_MAX_BYTES_BY_KIND,
} from '@/lib/storage/upload-media';
import { useAuth } from '@/hooks/use-auth';
import { SettingsPanelHead } from './settings-panel-head';
import type {
  MessageTemplate,
  TemplateButton,
  TemplateSampleValues,
} from '@/types';
import { templateStatusConfig } from '@/lib/template-status';
import {
  extractVariableIndices,
  TEMPLATE_LIMITS,
} from '@/lib/whatsapp/template-validators';

const CATEGORIES = ['Marketing', 'Utility', 'Authentication'] as const;
type HeaderFormat = 'none' | 'text' | 'image' | 'video' | 'document';
const HEADER_FORMATS: HeaderFormat[] = ['none', 'text', 'image', 'video', 'document'];

const COMMON_LANGUAGE_CODES = [
  'pt_BR', 'pt_PT', 'en_US', 'en_GB', 'en', 'es', 'es_ES', 'es_MX',
  'fr', 'fr_FR', 'de', 'it', 'nl', 'pl', 'ru', 'tr', 'lt',
];

interface TemplateFormData {
  name: string;
  category: MessageTemplate['category'];
  language: string;
  header_format: HeaderFormat;
  header_content: string;
  header_media_url: string;
  header_sample: string;
  body_text: string;
  body_samples: string[];
  footer_text: string;
  buttons: TemplateButton[];
}

const emptyForm: TemplateFormData = {
  name: '',
  category: 'Marketing',
  language: 'pt_BR',
  header_format: 'none',
  header_content: '',
  header_media_url: '',
  header_sample: '',
  body_text: '',
  body_samples: [],
  footer_text: '',
  buttons: [],
};

function emptyButton(type: TemplateButton['type']): TemplateButton {
  switch (type) {
    case 'QUICK_REPLY': return { type: 'QUICK_REPLY', text: '' };
    case 'URL': return { type: 'URL', text: '', url: '' };
    case 'PHONE_NUMBER': return { type: 'PHONE_NUMBER', text: '', phone_number: '' };
    case 'COPY_CODE': return { type: 'COPY_CODE', text: '', example: '' };
  }
}

// ── WhatsApp Live Preview ───────────────────────────────────────────────────

function interpolate(text: string, samples: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const val = samples[Number(n) - 1];
    return val && val.trim() ? val.trim() : `{{${n}}}`;
  });
}

function WAPreview({ form }: { form: TemplateFormData }) {
  const bodyText = interpolate(form.body_text, form.body_samples);
  const headerText =
    form.header_format === 'text'
      ? interpolate(form.header_content, form.header_sample ? [form.header_sample] : [])
      : '';

  const hasContent = form.body_text || form.header_format !== 'none' || form.footer_text || form.buttons.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(43,111,219,0.10)' }}
        >
          <Phone className="h-5 w-5" style={{ color: 'var(--ei-cobalt)' }} />
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Preencha o template para<br />ver o preview ao vivo
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center px-4 py-6 min-h-full"
      style={{
        background: 'linear-gradient(180deg, #0d1b2a 0%, #0a1322 100%)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231a3f9e' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    >
      {/* Phone frame hint */}
      <p className="text-[10px] mb-4 uppercase tracking-widest" style={{ color: 'rgba(159,176,201,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>
        Preview WhatsApp
      </p>

      {/* Bubble */}
      <div className="w-full max-w-[280px]">
        <div
          className="rounded-[12px_12px_4px_12px] overflow-hidden"
          style={{
            backgroundColor: '#1a3f6e',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
        >
          {/* Header */}
          {form.header_format === 'image' && (
            <div
              className="w-full h-36 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
            >
              {form.header_media_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.header_media_url} alt="header" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.3)' }} />
              )}
            </div>
          )}
          {form.header_format === 'video' && (
            <div className="w-full h-36 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
              <Video className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="ml-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Vídeo</span>
            </div>
          )}
          {form.header_format === 'document' && (
            <div className="w-full flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: 'rgba(0,0,0,0.20)' }}>
              <FileText className="h-5 w-5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
              <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {form.header_media_url ? form.header_media_url.split('/').pop() : 'documento.pdf'}
              </span>
            </div>
          )}
          {form.header_format === 'text' && headerText && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-sm font-bold leading-snug" style={{ color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {headerText}
              </p>
            </div>
          )}

          {/* Body */}
          <div className="px-3 pt-2 pb-1">
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#e8eaf0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {bodyText || <span style={{ color: 'rgba(232,234,240,0.35)' }}>Corpo da mensagem…</span>}
            </p>
          </div>

          {/* Footer */}
          {form.footer_text && (
            <div className="px-3 pb-1">
              <p className="text-[11px]" style={{ color: 'rgba(232,234,240,0.50)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {form.footer_text}
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex justify-end px-3 pb-2">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(232,234,240,0.40)', fontFamily: "'JetBrains Mono', monospace" }}>
              09:41
              <CheckCheck className="h-3 w-3" style={{ color: '#1AB8A0' }} />
            </span>
          </div>
        </div>

        {/* Buttons */}
        {form.buttons.length > 0 && (
          <div className="mt-1 space-y-1">
            {form.buttons.map((btn, i) => (
              <div
                key={i}
                className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium"
                style={{
                  backgroundColor: '#1a3f6e',
                  color: '#5badff',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                {btn.type === 'URL' && <Link2 className="h-3.5 w-3.5" />}
                {btn.type === 'PHONE_NUMBER' && <Phone className="h-3.5 w-3.5" />}
                {btn.type === 'COPY_CODE' && <Copy className="h-3.5 w-3.5" />}
                {btn.type === 'QUICK_REPLY' && <ChevronRight className="h-3.5 w-3.5" />}
                {btn.text || `Botão ${i + 1}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared field wrapper ────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--ei-text-soft)', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function EiInput({ value, onChange, placeholder, disabled, maxLength, list, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; maxLength?: number; list?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      list={list}
      className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors ${className}`}
      style={{
        backgroundColor: 'rgba(159,176,201,0.06)',
        border: '1px solid rgba(159,176,201,0.18)',
        color: 'var(--ei-offwhite)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        opacity: disabled ? 0.5 : 1,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(43,111,219,0.50)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(159,176,201,0.18)'; }}
    />
  );
}

function EiTextarea({ value, onChange, placeholder, rows = 4, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none transition-colors"
      style={{
        backgroundColor: 'rgba(159,176,201,0.06)',
        border: '1px solid rgba(159,176,201,0.18)',
        color: 'var(--ei-offwhite)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(43,111,219,0.50)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(159,176,201,0.18)'; }}
    />
  );
}

function EiSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
      style={{
        backgroundColor: 'rgba(159,176,201,0.06)',
        border: '1px solid rgba(159,176,201,0.18)',
        color: 'var(--ei-offwhite)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  APPROVED:  { bg: 'rgba(26,184,160,0.12)', color: 'var(--ei-iris)' },
  PENDING:   { bg: 'rgba(234,154,13,0.12)', color: '#EAA40D' },
  REJECTED:  { bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
  PAUSED:    { bg: 'rgba(159,176,201,0.10)', color: 'var(--ei-text-soft)' },
  DRAFT:     { bg: 'rgba(159,176,201,0.10)', color: 'var(--ei-text-soft)' },
};

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  Marketing:      { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
  Utility:        { bg: 'rgba(43,111,219,0.12)',  color: 'var(--ei-cobalt)' },
  Authentication: { bg: 'rgba(234,154,13,0.12)',  color: '#EAA40D' },
};

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: bg, color, fontFamily: "'JetBrains Mono', monospace" }}
    >
      {label}
    </span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function TemplateManager() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState<TemplateFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const headerFileRef = useRef<HTMLInputElement>(null);

  const bodyVarCount = useMemo(
    () => extractVariableIndices(form.body_text).length,
    [form.body_text],
  );
  const headerVarCount = useMemo(
    () => form.header_format === 'text' ? extractVariableIndices(form.header_content).length : 0,
    [form.header_format, form.header_content],
  );

  useEffect(() => {
    setForm(prev => {
      if (prev.body_samples.length === bodyVarCount) return prev;
      const next = prev.body_samples.slice(0, bodyVarCount);
      while (next.length < bodyVarCount) next.push('');
      return { ...prev, body_samples: next };
    });
  }, [bodyVarCount]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    fetchTemplates(user.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  async function fetchTemplates(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('message_templates').select('*')
        .eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar templates');
    } finally {
      setLoading(false);
    }
  }

  function buildPayload() {
    const sample_values: TemplateSampleValues = {};
    if (form.body_samples.some(v => v.trim())) sample_values.body = form.body_samples.map(v => v.trim());
    if (form.header_format === 'text' && form.header_sample.trim()) sample_values.header = [form.header_sample.trim()];
    return {
      name: form.name.trim(),
      category: form.category,
      language: form.language.trim() || 'pt_BR',
      header_type: form.header_format === 'none' ? undefined : form.header_format,
      header_content: form.header_format === 'text' ? form.header_content.trim() : undefined,
      header_media_url: form.header_format !== 'none' && form.header_format !== 'text' ? form.header_media_url.trim() || undefined : undefined,
      body_text: form.body_text.trim(),
      footer_text: form.footer_text.trim() || undefined,
      buttons: form.buttons.length > 0 ? form.buttons : undefined,
      sample_values: Object.keys(sample_values).length > 0 ? sample_values : undefined,
    };
  }

  function openEdit(template: MessageTemplate) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      category: template.category,
      language: template.language || 'pt_BR',
      header_format: (template.header_type ?? 'none') as HeaderFormat,
      header_content: template.header_content ?? '',
      header_media_url: template.header_media_url ?? '',
      header_sample: template.sample_values?.header?.[0] ?? '',
      body_text: template.body_text,
      body_samples: template.sample_values?.body ?? [],
      footer_text: template.footer_text ?? '',
      buttons: template.buttons ?? [],
    });
    setPanelOpen(true);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setPanelOpen(true);
  }

  async function handleSubmit() {
    if (form.category === 'Authentication') return;
    try {
      setSubmitting(true);
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/whatsapp/templates/${editingId}` : '/api/whatsapp/templates/submit';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Falha (HTTP ${res.status})`);
      if (user) await fetchTemplates(user.id);
      toast.success(
        data.dry_run
          ? isEdit ? 'Template atualizado (dry-run)' : 'Template salvo (dry-run)'
          : isEdit ? 'Reeditado — revisão da Meta em até 24h.' : 'Enviado para Meta — revisão em até 24h.',
      );
      setPanelOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSyncFromMeta() {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Sync falhou (HTTP ${res.status})`);
      toast.success(`${data.total} template${data.total === 1 ? '' : 's'} sincronizados da Meta`);
      if (data.truncated) toast.error('Apenas os primeiros 2000 templates foram sincronizados.', { duration: 10000 });
      await fetchTemplates(user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync falhou');
    } finally {
      setSyncing(false);
    }
  }

  async function confirmDelete() {
    const target = templateToDelete;
    if (!target || deletingId) return;
    setDeletingId(target.id);
    try {
      const res = await fetch(`/api/whatsapp/templates/${target.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Exclusão falhou (HTTP ${res.status})`);
      toast.success('Template excluído');
      setTemplates(prev => prev.filter(t => t.id !== target.id));
      setTemplateToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir');
    } finally {
      setDeletingId(null);
    }
  }

  type ButtonPatch = { text?: string; url?: string; phone_number?: string; example?: string };
  function updateButton(index: number, patch: ButtonPatch) {
    setForm(prev => {
      const current = prev.buttons[index];
      if (!current) return prev;
      const next = [...prev.buttons];
      switch (current.type) {
        case 'QUICK_REPLY': next[index] = { ...current, ...(patch.text !== undefined && { text: patch.text }) }; break;
        case 'URL': next[index] = { ...current, ...(patch.text !== undefined && { text: patch.text }), ...(patch.url !== undefined && { url: patch.url }), ...(patch.example !== undefined && { example: patch.example }) }; break;
        case 'PHONE_NUMBER': next[index] = { ...current, ...(patch.text !== undefined && { text: patch.text }), ...(patch.phone_number !== undefined && { phone_number: patch.phone_number }) }; break;
        case 'COPY_CODE': next[index] = { ...current, ...(patch.text !== undefined && { text: patch.text }), ...(patch.example !== undefined && { example: patch.example }) }; break;
      }
      return { ...prev, buttons: next };
    });
  }

  function changeButtonType(index: number, type: TemplateButton['type']) {
    setForm(prev => { const next = [...prev.buttons]; next[index] = emptyButton(type); return { ...prev, buttons: next }; });
  }

  async function handleHeaderImageFile(file: File) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) { toast.error('Apenas JPEG ou PNG.'); return; }
    if (file.size > MEDIA_MAX_BYTES_BY_KIND.image) { toast.error(`Imagem grande demais — limite 5 MB.`); return; }
    setUploadingHeader(true);
    try {
      const { publicUrl } = await uploadAccountMedia('chat-media', file);
      setForm(f => ({ ...f, header_media_url: publicUrl }));
      toast.success('Imagem enviada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload falhou.');
    } finally {
      setUploadingHeader(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--ei-cobalt)' }} />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <SettingsPanelHead
        title="Templates de mensagem"
        description="Crie templates e envie para aprovação da Meta. Use 'Sincronizar' para puxar templates aprovados externamente."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFromMeta}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(159,176,201,0.06)',
                border: '1px solid rgba(159,176,201,0.18)',
                color: 'var(--ei-text-soft)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--ei-cobalt)',
                color: 'var(--ei-offwhite)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <Plus className="h-4 w-4" />
              Novo template
            </button>
          </div>
        }
      />

      {/* Template list */}
      {templates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
          style={{ backgroundColor: 'var(--ei-surface-card)', border: '1px solid rgba(159,176,201,0.18)' }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(43,111,219,0.10)' }}>
            <FileText className="h-6 w-6" style={{ color: 'var(--ei-cobalt)' }} />
          </div>
          <p className="mt-3 text-sm font-medium" style={{ color: 'var(--ei-offwhite)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Nenhum template ainda</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Crie seu primeiro template para começar.</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {templates.map(template => {
            const statusKey = template.status || 'DRAFT';
            const status = templateStatusConfig[statusKey];
            const catStyle = CATEGORY_STYLES[template.category] ?? CATEGORY_STYLES.Utility;
            const stStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.DRAFT;
            return (
              <div
                key={template.id}
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--ei-surface-card)', border: '1px solid rgba(159,176,201,0.18)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold" style={{ color: 'var(--ei-offwhite)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {template.name}
                      </span>
                      <Pill label={template.category} bg={catStyle.bg} color={catStyle.color} />
                      <Pill label={status.label} bg={stStyle.bg} color={stStyle.color} />
                      {template.language && (
                        <span className="text-[10px] uppercase" style={{ color: 'var(--ei-text-soft)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {template.language}
                        </span>
                      )}
                      {template.quality_score && (
                        <span
                          className="text-[10px] uppercase font-medium"
                          style={{
                            color: template.quality_score === 'GREEN' ? 'var(--ei-iris)' : template.quality_score === 'YELLOW' ? '#EAA40D' : '#f87171',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {template.quality_score}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {template.body_text}
                    </p>
                    {(template.rejection_reason || template.submission_error) && (
                      <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171' }}>
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{template.rejection_reason || template.submission_error}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {(statusKey === 'APPROVED' || statusKey === 'REJECTED' || statusKey === 'PAUSED') && (
                      <button
                        onClick={() => openEdit(template)}
                        className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors"
                        style={{ color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ei-cobalt)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(43,111,219,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ei-text-soft)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                      >
                        {statusKey === 'APPROVED' ? <Pencil className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        {statusKey === 'APPROVED' ? 'Editar' : 'Reenviar'}
                      </button>
                    )}
                    <button
                      onClick={() => setTemplateToDelete(template)}
                      disabled={deletingId === template.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                      style={{ color: 'var(--ei-text-soft)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ei-text-soft)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                    >
                      {deletingId === template.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-over editor with live preview ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setPanelOpen(false); setEditingId(null); setForm(emptyForm); }}
          />

          {/* Panel */}
          <div
            className="relative ml-auto flex h-full w-full max-w-5xl overflow-hidden"
            style={{ backgroundColor: 'var(--ei-surface-card)', borderLeft: '1px solid rgba(159,176,201,0.18)' }}
          >
            {/* Left: form */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ borderBottom: '1px solid rgba(159,176,201,0.18)', backgroundColor: 'var(--ei-surface-card)' }}
              >
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--ei-offwhite)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {editingId ? 'Editar Template' : 'Novo Template'}
                  </h2>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {editingId ? 'Salvar reenvida para revisão da Meta.' : 'Preencha e envie para aprovação — revisão típica em 24h.'}
                  </p>
                </div>
                <button
                  onClick={() => { setPanelOpen(false); setEditingId(null); setForm(emptyForm); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--ei-text-soft)' }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form body */}
              <div className="space-y-5 p-6 flex-1">
                {form.category === 'Authentication' && (
                  <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'rgba(234,154,13,0.08)', border: '1px solid rgba(234,154,13,0.20)', color: '#EAA40D' }}>
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Templates AUTHENTICATION têm formato fixo. Crie-os no Meta WhatsApp Manager e use <strong>Sincronizar</strong>.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nome do template" hint={editingId ? 'Nome fixo — não pode ser alterado.' : 'Apenas letras minúsculas, números e _'}>
                    <EiInput
                      value={form.name}
                      onChange={v => setForm({ ...form, name: v })}
                      placeholder="ex: confirmacao_pedido"
                      disabled={editingId !== null}
                    />
                  </Field>
                  <Field label="Idioma" hint={editingId ? 'Idioma fixo após criação.' : undefined}>
                    <EiInput
                      value={form.language}
                      onChange={v => setForm({ ...form, language: v })}
                      placeholder="pt_BR"
                      disabled={editingId !== null}
                      list="template-lang-codes"
                    />
                    <datalist id="template-lang-codes">
                      {COMMON_LANGUAGE_CODES.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </Field>
                </div>

                <Field label="Categoria">
                  <EiSelect
                    value={form.category}
                    onChange={v => setForm({ ...form, category: v as MessageTemplate['category'] })}
                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  />
                </Field>

                <Field label="Header">
                  <EiSelect
                    value={form.header_format}
                    onChange={v => setForm({ ...form, header_format: (v || 'none') as HeaderFormat })}
                    options={HEADER_FORMATS.map(f => ({ value: f, label: f === 'none' ? 'Nenhum' : f.charAt(0).toUpperCase() + f.slice(1) }))}
                  />
                  {form.header_format === 'text' && (
                    <div className="mt-2 space-y-2">
                      <EiInput
                        value={form.header_content}
                        onChange={v => setForm({ ...form, header_content: v })}
                        placeholder="Texto do header (máx. 60 chars, {{1}} opcional)"
                        maxLength={TEMPLATE_LIMITS.headerTextMaxLength}
                      />
                      {headerVarCount > 0 && (
                        <EiInput
                          value={form.header_sample}
                          onChange={v => setForm({ ...form, header_sample: v })}
                          placeholder="Valor de exemplo para {{1}}"
                        />
                      )}
                    </div>
                  )}
                  {form.header_format !== 'none' && form.header_format !== 'text' && (
                    <div className="mt-2 space-y-2">
                      {form.header_format === 'image' && (
                        <div className="flex items-center gap-2">
                          <input ref={headerFileRef} type="file" accept="image/jpeg,image/png" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) void handleHeaderImageFile(f); e.target.value = ''; }}
                          />
                          <button
                            type="button"
                            disabled={uploadingHeader}
                            onClick={() => headerFileRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
                            style={{ backgroundColor: 'rgba(43,111,219,0.10)', color: 'var(--ei-cobalt)', border: '1px solid rgba(43,111,219,0.20)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          >
                            {uploadingHeader ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Enviar imagem
                          </button>
                          <span className="text-[11px]" style={{ color: 'var(--ei-text-soft)' }}>JPEG/PNG ≤5 MB</span>
                        </div>
                      )}
                      <EiInput
                        value={form.header_media_url}
                        onChange={v => setForm({ ...form, header_media_url: v })}
                        placeholder={`https://… (link público do ${form.header_format})`}
                      />
                    </div>
                  )}
                </Field>

                <Field label="Corpo da mensagem" hint="Use {{1}}, {{2}}… para variáveis. Devem ser contíguas a partir de {{1}}.">
                  <EiTextarea
                    value={form.body_text}
                    onChange={v => setForm({ ...form, body_text: v })}
                    placeholder="Olá {{1}}, seu pedido {{2}} foi confirmado!"
                    rows={5}
                    maxLength={TEMPLATE_LIMITS.bodyMaxLength}
                  />
                  {bodyVarCount > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ei-text-soft)', fontFamily: "'JetBrains Mono', monospace" }}>
                        Valores de exemplo
                      </p>
                      {form.body_samples.map((val, i) => (
                        <EiInput
                          key={i}
                          value={val}
                          onChange={v => { const next = [...form.body_samples]; next[i] = v; setForm({ ...form, body_samples: next }); }}
                          placeholder={`Exemplo para {{${i + 1}}}`}
                        />
                      ))}
                    </div>
                  )}
                </Field>

                <Field label="Rodapé (opcional)">
                  <EiInput
                    value={form.footer_text}
                    onChange={v => setForm({ ...form, footer_text: v })}
                    placeholder="Texto do rodapé (máx. 60 chars)"
                    maxLength={TEMPLATE_LIMITS.footerMaxLength}
                  />
                </Field>

                <Field label="Botões (opcional)">
                  <div className="space-y-2">
                    {form.buttons.map((btn, i) => (
                      <div key={i} className="space-y-2 rounded-lg p-3" style={{ backgroundColor: 'rgba(159,176,201,0.04)', border: '1px solid rgba(159,176,201,0.14)' }}>
                        <div className="flex items-center gap-2">
                          <EiSelect
                            value={btn.type}
                            onChange={v => { if (!v) return; changeButtonType(i, v as TemplateButton['type']); }}
                            options={[
                              { value: 'QUICK_REPLY', label: 'Quick Reply' },
                              { value: 'URL', label: 'URL' },
                              { value: 'PHONE_NUMBER', label: 'Telefone' },
                              { value: 'COPY_CODE', label: 'Copiar código' },
                            ]}
                          />
                          <div className="flex-1">
                            <EiInput
                              value={btn.text}
                              onChange={v => updateButton(i, { text: v })}
                              placeholder="Rótulo do botão"
                              maxLength={TEMPLATE_LIMITS.buttonTextMaxLength}
                            />
                          </div>
                          <button
                            onClick={() => setForm(prev => ({ ...prev, buttons: prev.buttons.filter((_, j) => j !== i) }))}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                            style={{ color: 'var(--ei-text-soft)' }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {btn.type === 'URL' && (
                          <div className="space-y-1.5 pl-1">
                            <EiInput value={btn.url} onChange={v => updateButton(i, { url: v })} placeholder="https://exemplo.com/{{1}}" />
                            {extractVariableIndices(btn.url).length > 0 && (
                              <EiInput value={btn.example ?? ''} onChange={v => updateButton(i, { example: v })} placeholder="Exemplo para {{1}}" />
                            )}
                          </div>
                        )}
                        {btn.type === 'PHONE_NUMBER' && (
                          <EiInput value={btn.phone_number} onChange={v => updateButton(i, { phone_number: v })} placeholder="+5511999990000" />
                        )}
                        {btn.type === 'COPY_CODE' && (
                          <EiInput value={btn.example} onChange={v => updateButton(i, { example: v })} placeholder="ex: SUMMER20" />
                        )}
                      </div>
                    ))}
                    {form.buttons.length < TEMPLATE_LIMITS.maxButtonsTotal && (
                      <button
                        onClick={() => setForm(prev => ({ ...prev, buttons: [...prev.buttons, emptyButton('QUICK_REPLY')] }))}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
                        style={{ backgroundColor: 'rgba(43,111,219,0.06)', color: 'var(--ei-cobalt)', border: '1px dashed rgba(43,111,219,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar botão
                      </button>
                    )}
                  </div>
                </Field>
              </div>

              {/* Footer actions */}
              <div
                className="flex justify-end gap-2 px-6 py-4 shrink-0"
                style={{ borderTop: '1px solid rgba(159,176,201,0.18)', backgroundColor: 'var(--ei-surface-card)' }}
              >
                <button
                  onClick={() => { setPanelOpen(false); setEditingId(null); setForm(emptyForm); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'rgba(159,176,201,0.08)', border: '1px solid rgba(159,176,201,0.18)', color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || form.category === 'Authentication'}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--ei-cobalt)', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? (editingId ? 'Salvando…' : 'Enviando…') : (editingId ? 'Salvar e Reenviar' : 'Enviar para Aprovação')}
                </button>
              </div>
            </div>

            {/* Right: live preview */}
            <div
              className="hidden w-72 shrink-0 overflow-y-auto lg:block"
              style={{ borderLeft: '1px solid rgba(159,176,201,0.18)', backgroundColor: '#071120' }}
            >
              <WAPreview form={form} />
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={() => setTemplateToDelete(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-xl p-6"
            style={{ backgroundColor: 'var(--ei-surface-card)', border: '1px solid rgba(159,176,201,0.18)' }}
          >
            <h3 className="text-base font-semibold" style={{ color: 'var(--ei-offwhite)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Excluir template?
            </h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {templateToDelete.meta_template_id
                ? `"${templateToDelete.name}" será excluído da Meta e do Lumiar. Broadcasts ativos com este template irão falhar. Essa ação não pode ser desfeita.`
                : `"${templateToDelete.name}" será excluído do Lumiar. Nunca foi enviado à Meta.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setTemplateToDelete(null)}
                disabled={deletingId !== null}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: 'rgba(159,176,201,0.08)', border: '1px solid rgba(159,176,201,0.18)', color: 'var(--ei-text-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#dc2626', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {deletingId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                {deletingId !== null ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
