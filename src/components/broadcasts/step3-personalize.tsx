'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Contact, CustomField, MessageTemplate } from '@/types';
import { ArrowLeft, ArrowRight, Eye, Loader2 } from 'lucide-react';

type VariableType = 'static' | 'field' | 'custom_field';

interface VariableMapping {
  type: VariableType;
  value: string;
}

interface Step3Props {
  template: MessageTemplate;
  variables: Record<string, VariableMapping>;
  onUpdate: (variables: Record<string, VariableMapping>) => void;
  onNext: () => void;
  onBack: () => void;
}

const contactFields = [
  { value: 'name', label: 'Nome do Contato' },
  { value: 'phone', label: 'Número de Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'company', label: 'Empresa' },
];

const SAMPLE_CONTACT: Contact = {
  id: 'sample',
  user_id: '',
  account_id: '',
  name: 'João Silva',
  phone: '+5511999999999',
  email: 'joao@exemplo.com',
  company: 'Empresa Exemplo',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: "none",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(159,176,201,0.18)",
  backgroundColor: "rgba(159,176,201,0.04)",
  borderRadius: "12px",
  padding: "16px",
};

export function Step3Personalize({
  template,
  variables,
  onUpdate,
  onNext,
  onBack,
}: Step3Props) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [firstContact, setFirstContact] = useState<Contact | null>(null);
  const [firstContactCustomValues, setFirstContactCustomValues] = useState<Map<string, string>>(new Map());
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [fieldsRes, contactRes] = await Promise.all([
        supabase.from('custom_fields').select('*').order('field_name'),
        supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      setCustomFields(fieldsRes.data ?? []);
      setLoadingFields(false);

      const contact = contactRes.data ?? null;
      setFirstContact(contact);

      if (contact) {
        const { data: customVals } = await supabase
          .from('contact_custom_values')
          .select('custom_field_id, value')
          .eq('contact_id', contact.id);
        if (!cancelled) {
          const map = new Map<string, string>();
          for (const row of customVals ?? []) {
            map.set(row.custom_field_id, row.value ?? '');
          }
          setFirstContactCustomValues(map);
        }
      }
      setLoadingPreview(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const placeholders = useMemo(() => {
    const matches = template.body_text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches)].sort();
  }, [template.body_text]);

  const unmappedKeys = useMemo(() => {
    const missing: string[] = [];
    for (const placeholder of placeholders) {
      const key = placeholder.replace(/^\{\{|\}\}$/g, '');
      const mapping = variables[key];
      if (!mapping || !mapping.value?.trim()) {
        missing.push(placeholder);
      }
    }
    return missing;
  }, [placeholders, variables]);

  function updateVariable(key: string, patch: Partial<VariableMapping>) {
    const current = variables[key] ?? { type: 'static' as VariableType, value: '' };
    onUpdate({ ...variables, [key]: { ...current, ...patch } });
  }

  const previewText = useMemo(() => {
    const contact = firstContact ?? SAMPLE_CONTACT;
    const customValues = firstContact ? firstContactCustomValues : new Map<string, string>();

    let text = template.body_text;
    for (const placeholder of placeholders) {
      const key = placeholder.replace(/^\{\{|\}\}$/g, '');
      const mapping = variables[key];
      let replacement = placeholder;

      if (mapping) {
        if (mapping.type === 'static' && mapping.value) {
          replacement = mapping.value;
        } else if (mapping.type === 'field' && mapping.value) {
          const fieldMap: Record<string, string | undefined> = {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            company: contact.company,
          };
          replacement = fieldMap[mapping.value] ?? placeholder;
        } else if (mapping.type === 'custom_field' && mapping.value) {
          replacement = customValues.get(mapping.value) || placeholder;
        }
      }
      text = text.replaceAll(placeholder, replacement);
    }
    return text;
  }, [template.body_text, variables, placeholders, firstContact, firstContactCustomValues]);

  const previewLabel = firstContact
    ? firstContact.name || firstContact.phone
    : 'dados de exemplo';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Personalizar Mensagem
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Mapeie as variáveis do template para campos do contato, campos personalizados ou valores fixos.
        </p>
      </div>

      {placeholders.length === 0 ? (
        <div className="rounded-xl p-6 text-center" style={{ border: "1px solid rgba(159,176,201,0.18)", backgroundColor: "rgba(159,176,201,0.04)" }}>
          <p className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Este template não tem variáveis para personalizar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {placeholders.map((placeholder) => {
            const key = placeholder.replace(/^\{\{|\}\}$/g, '');
            const mapping = variables[key] ?? { type: 'static', value: '' };

            return (
              <div key={placeholder} style={cardStyle}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-medium"
                    style={{ backgroundColor: "rgba(43,111,219,0.12)", color: "var(--ei-cobalt)" }}
                  >
                    {placeholder}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Tipo de mapeamento
                    </label>
                    <select
                      value={mapping.type}
                      onChange={(e) => updateVariable(key, { type: e.target.value as VariableType, value: '' })}
                      className="h-9 w-full rounded-lg px-2.5 text-sm"
                      style={inputStyle}
                    >
                      <option value="static">Valor fixo</option>
                      <option value="field">Campo do contato</option>
                      <option value="custom_field">Campo personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {mapping.type === 'static' ? 'Valor' : 'Campo'}
                    </label>
                    {mapping.type === 'static' ? (
                      <input
                        type="text"
                        value={mapping.value}
                        onChange={(e) => updateVariable(key, { value: e.target.value })}
                        placeholder="Digite o valor…"
                        className="h-9 w-full rounded-lg px-2.5 text-sm"
                        style={inputStyle}
                      />
                    ) : mapping.type === 'field' ? (
                      <select
                        value={mapping.value || ''}
                        onChange={(e) => updateVariable(key, { value: e.target.value })}
                        className="h-9 w-full rounded-lg px-2.5 text-sm"
                        style={inputStyle}
                      >
                        <option value="">Selecionar campo…</option>
                        {contactFields.map((field) => (
                          <option key={field.value} value={field.value}>{field.label}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={mapping.value || ''}
                        onChange={(e) => updateVariable(key, { value: e.target.value })}
                        className="h-9 w-full rounded-lg px-2.5 text-sm"
                        style={inputStyle}
                        disabled={loadingFields || customFields.length === 0}
                      >
                        <option value="">
                          {loadingFields ? 'Carregando…' : customFields.length === 0 ? 'Sem campos' : 'Selecionar campo…'}
                        </option>
                        {customFields.map((f) => (
                          <option key={f.id} value={f.id}>{f.field_name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pré-visualização */}
      <div style={cardStyle}>
        <div className="mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" style={{ color: "var(--ei-cobalt)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Pré-visualização
          </p>
          <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            ({previewLabel})
          </span>
          {loadingPreview && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
          )}
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: "#0e1a12" }}>
          <div
            className="ml-auto max-w-[85%] rounded-lg px-3 py-2 shadow-sm"
            style={{ backgroundColor: "rgba(26,184,160,0.25)" }}
          >
            <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--ei-iris)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {previewText}
            </p>
          </div>
        </div>
      </div>

      {unmappedKeys.length > 0 && (
        <div
          className="rounded-md px-3 py-2 text-xs"
          style={{ border: "1px solid rgba(245,158,11,0.35)", backgroundColor: "rgba(245,158,11,0.10)", color: "#fcd34d", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Mapeie todos os marcadores antes de continuar — ainda falta:{' '}
          <span className="font-mono font-semibold">{unmappedKeys.join(', ')}</span>.
        </div>
      )}

      <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: "rgba(159,176,201,0.08)", border: "1px solid rgba(159,176,201,0.22)", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.14)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={unmappedKeys.length > 0}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => { if (unmappedKeys.length === 0) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
        >
          Próximo
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
