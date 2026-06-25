'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CustomField, Tag } from '@/types';
import {
  Users,
  Tags,
  Filter,
  Upload,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';

type AudienceType = 'all' | 'tags' | 'custom_field' | 'csv';
type CustomFieldOperator = 'is' | 'is_not' | 'contains';

interface CustomFieldFilter {
  fieldId: string;
  operator: CustomFieldOperator;
  value: string;
}

interface AudienceConfig {
  type: AudienceType;
  tagIds?: string[];
  customField?: CustomFieldFilter;
  csvContacts?: { phone: string; name?: string }[];
  excludeTagIds?: string[];
}

interface Step2Props {
  audience: AudienceConfig;
  onUpdate: (audience: AudienceConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

const audienceOptions: {
  type: AudienceType;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    type: 'all',
    label: 'Todos os Contatos',
    description: 'Enviar para todos os contatos do banco de dados',
    icon: Users,
  },
  {
    type: 'tags',
    label: 'Filtrar por Tags',
    description: 'Segmentar contatos com tags específicas',
    icon: Tags,
  },
  {
    type: 'custom_field',
    label: 'Campo Personalizado',
    description: 'Filtrar por valor de campo personalizado',
    icon: Filter,
  },
  {
    type: 'csv',
    label: 'Importar CSV',
    description: 'Carregar uma lista de números de telefone',
    icon: Upload,
  },
];

const OPERATOR_OPTIONS: { value: CustomFieldOperator; label: string }[] = [
  { value: 'is', label: 'é' },
  { value: 'is_not', label: 'não é' },
  { value: 'contains', label: 'contém' },
];

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: "none",
};

export function Step2SelectAudience({
  audience,
  onUpdate,
  onNext,
  onBack,
}: Step2Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    async function fetchTags() {
      setLoadingTags(true);
      try {
        const supabase = createClient();
        const { data } = await supabase.from('tags').select('*').order('name');
        setTags(data ?? []);
      } finally {
        setLoadingTags(false);
      }
    }
    fetchTags();
  }, []);

  useEffect(() => {
    if (audience.type !== 'custom_field') return;
    async function fetchFields() {
      setLoadingFields(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('custom_fields')
          .select('*')
          .order('field_name');
        setCustomFields(data ?? []);
      } finally {
        setLoadingFields(false);
      }
    }
    fetchFields();
  }, [audience.type]);

  const fetchEstimatedCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      const supabase = createClient();
      let baseIds: Set<string> | null = null;

      if (audience.type === 'all') {
        // handled below
      } else if (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) {
        const { data } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', audience.tagIds);
        baseIds = new Set((data ?? []).map((r) => r.contact_id));
      } else if (
        audience.type === 'custom_field' &&
        audience.customField?.fieldId &&
        audience.customField.value
      ) {
        const { fieldId, operator, value } = audience.customField;
        let q = supabase
          .from('contact_custom_values')
          .select('contact_id')
          .eq('custom_field_id', fieldId);
        if (operator === 'is') q = q.eq('value', value);
        else if (operator === 'is_not') q = q.neq('value', value);
        else q = q.ilike('value', `%${value}%`);
        const { data } = await q;
        baseIds = new Set((data ?? []).map((r) => r.contact_id));
      } else if (audience.type === 'csv' && audience.csvContacts && audience.csvContacts.length > 0) {
        setEstimatedCount(audience.csvContacts.length);
        return;
      } else {
        setEstimatedCount(null);
        return;
      }

      let excludeSet: Set<string> | null = null;
      if (audience.excludeTagIds && audience.excludeTagIds.length > 0) {
        const { data: excludeRows } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', audience.excludeTagIds);
        excludeSet = new Set((excludeRows ?? []).map((r) => r.contact_id));
      }

      if (baseIds) {
        const effective = [...baseIds].filter((id) => !excludeSet?.has(id));
        setEstimatedCount(effective.length);
      } else {
        const { count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true });
        const total = count ?? 0;
        setEstimatedCount(excludeSet ? Math.max(0, total - excludeSet.size) : total);
      }
    } finally {
      setLoadingCount(false);
    }
  }, [audience.type, audience.tagIds, audience.customField, audience.csvContacts, audience.excludeTagIds]);

  useEffect(() => {
    fetchEstimatedCount();
  }, [fetchEstimatedCount]);

  function toggleTag(tagId: string) {
    const current = audience.tagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ ...audience, tagIds: updated });
  }

  function toggleExcludeTag(tagId: string) {
    const current = audience.excludeTagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ ...audience, excludeTagIds: updated });
  }

  function updateCustomField(patch: Partial<CustomFieldFilter>) {
    const prev = audience.customField ?? {
      fieldId: '',
      operator: 'is' as CustomFieldOperator,
      value: '',
    };
    onUpdate({ ...audience, customField: { ...prev, ...patch } });
  }

  const isValid =
    audience.type === 'all' ||
    (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) ||
    (audience.type === 'custom_field' &&
      !!audience.customField?.fieldId &&
      audience.customField.value.length > 0) ||
    (audience.type === 'csv' && audience.csvContacts && audience.csvContacts.length > 0);

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(159,176,201,0.18)",
    backgroundColor: "rgba(159,176,201,0.04)",
    borderRadius: "12px",
    padding: "16px",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Selecionar Audiência
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Escolha quem receberá este broadcast.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {audienceOptions.map((option) => {
          const isSelected = audience.type === option.type;
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              onClick={() =>
                onUpdate({
                  ...audience,
                  type: option.type,
                  tagIds: option.type === 'tags' ? audience.tagIds : undefined,
                  customField: option.type === 'custom_field' ? audience.customField : undefined,
                  csvContacts: option.type === 'csv' ? audience.csvContacts : undefined,
                })
              }
              className="flex items-start gap-3 rounded-xl p-4 text-left transition-all"
              style={{
                border: isSelected ? "1px solid rgba(43,111,219,0.60)" : "1px solid rgba(159,176,201,0.18)",
                backgroundColor: isSelected ? "rgba(43,111,219,0.08)" : "rgba(159,176,201,0.04)",
                boxShadow: isSelected ? "0 0 0 1px rgba(43,111,219,0.25)" : "none",
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: isSelected ? "rgba(43,111,219,0.12)" : "rgba(159,176,201,0.08)",
                  color: isSelected ? "var(--ei-cobalt)" : "var(--ei-text-soft)",
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {option.label}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {audience.type === 'tags' && (
        <div style={cardStyle}>
          <p className="mb-3 text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Selecionar Tags
          </p>
          {loadingTags ? (
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
          ) : tags.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nenhuma tag encontrada. Crie tags em Configurações.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isTagSelected = audience.tagIds?.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all"
                    style={{
                      border: isTagSelected ? "1px solid rgba(43,111,219,0.40)" : "1px solid rgba(159,176,201,0.22)",
                      backgroundColor: isTagSelected ? "rgba(43,111,219,0.10)" : "rgba(159,176,201,0.06)",
                      color: isTagSelected ? "var(--ei-cobalt)" : "var(--ei-text-soft)",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    <span className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {audience.type === 'custom_field' && (
        <div style={cardStyle} className="space-y-3">
          <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Filtro por Campo Personalizado
          </p>
          {loadingFields ? (
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
          ) : customFields.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nenhum campo personalizado definido. Crie um em Configurações → Campos.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)]">
              <select
                value={audience.customField?.fieldId ?? ''}
                onChange={(e) => updateCustomField({ fieldId: e.target.value })}
                className="h-9 rounded-lg px-2.5 text-sm"
                style={inputStyle}
              >
                <option value="">Selecionar campo…</option>
                {customFields.map((f) => (
                  <option key={f.id} value={f.id}>{f.field_name}</option>
                ))}
              </select>
              <select
                value={audience.customField?.operator ?? 'is'}
                onChange={(e) => updateCustomField({ operator: e.target.value as CustomFieldOperator })}
                className="h-9 rounded-lg px-2.5 text-sm"
                style={inputStyle}
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={audience.customField?.value ?? ''}
                onChange={(e) => updateCustomField({ value: e.target.value })}
                placeholder="Valor"
                className="h-9 rounded-lg px-2.5 text-sm"
                style={inputStyle}
              />
            </div>
          )}
        </div>
      )}

      {/* Excluir por tags */}
      <div style={cardStyle}>
        <div className="mb-3 flex items-center gap-2">
          <X className="h-4 w-4" style={{ color: "#f87171" }} />
          <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Excluir contatos com estas tags
          </p>
          <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            (opcional)
          </span>
        </div>
        {tags.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Nenhuma tag disponível.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isExcluded = audience.excludeTagIds?.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleExcludeTag(tag.id)}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all"
                  style={{
                    border: isExcluded ? "1px solid rgba(248,113,113,0.35)" : "1px solid rgba(159,176,201,0.22)",
                    backgroundColor: isExcluded ? "rgba(248,113,113,0.10)" : "rgba(159,176,201,0.06)",
                    color: isExcluded ? "#f87171" : "var(--ei-text-soft)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  <span className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumo da audiência */}
      <div style={cardStyle}>
        <p className="mb-2 text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Resumo da Audiência
        </p>
        {loadingCount ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
            <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Calculando…
            </span>
          </div>
        ) : estimatedCount !== null ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: "var(--ei-cobalt)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {estimatedCount.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              destinatários estimados
            </span>
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Selecione um tipo de audiência para ver a estimativa.
          </p>
        )}
      </div>

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
          disabled={!isValid}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => { if (isValid) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
        >
          Próximo
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
