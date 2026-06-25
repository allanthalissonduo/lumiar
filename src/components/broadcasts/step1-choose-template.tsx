'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageTemplate } from '@/types';
import { Loader2, FileText, ArrowRight, ArrowLeft } from 'lucide-react';

const CATEGORY_STYLE: Record<string, React.CSSProperties> = {
  Marketing: { backgroundColor: "rgba(168,85,247,0.10)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" },
  Utility: { backgroundColor: "rgba(43,111,219,0.12)", color: "var(--ei-cobalt)", border: "1px solid rgba(43,111,219,0.30)" },
  Authentication: { backgroundColor: "rgba(249,115,22,0.10)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.25)" },
};

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

interface Step1Props {
  selectedTemplate: MessageTemplate | null;
  onSelect: (template: MessageTemplate) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step1ChooseTemplate({ selectedTemplate, onSelect, onNext, onBack }: Step1Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('message_templates')
          .select('*')
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setTemplates(data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar templates');
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Escolher Template
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Selecione um template de mensagem aprovado para o seu broadcast.
        </p>
      </div>

      {templates.length === 0 ? (
        <div
          className="flex h-48 flex-col items-center justify-center rounded-xl"
          style={{ border: "1px solid rgba(159,176,201,0.18)", backgroundColor: "rgba(159,176,201,0.04)" }}
        >
          <FileText className="mb-2 h-8 w-8" style={{ color: "var(--ei-text-soft)" }} />
          <p className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Nenhum template disponível.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Crie um template em Configurações primeiro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;
            const catStyle = CATEGORY_STYLE[template.category] ?? CATEGORY_STYLE.Utility;

            return (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="flex flex-col gap-3 rounded-xl p-4 text-left transition-all"
                style={{
                  border: isSelected ? "1px solid rgba(43,111,219,0.60)" : "1px solid rgba(159,176,201,0.18)",
                  backgroundColor: isSelected ? "rgba(43,111,219,0.08)" : "rgba(159,176,201,0.04)",
                  boxShadow: isSelected ? "0 0 0 1px rgba(43,111,219,0.25)" : "none",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {template.name}
                  </h3>
                  <span
                    className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={catStyle}
                  >
                    {template.category}
                  </span>
                </div>
                <p className="line-clamp-3 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {template.body_text}
                </p>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>{template.language ?? 'pt_BR'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div
        className="flex items-center justify-between pt-4"
        style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ ...inputStyle, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.14)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedTemplate}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => { if (selectedTemplate) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
        >
          Próximo
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
