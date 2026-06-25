'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageTemplate } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Send, Loader2, Users, Save } from 'lucide-react';

interface AudienceConfig {
  type: string;
  tagIds?: string[];
  csvContacts?: { phone: string; name?: string }[];
}

interface Step4Props {
  name: string;
  onNameChange: (name: string) => void;
  template: MessageTemplate;
  audience: AudienceConfig;
  onSend: () => void;
  onSaveDraft?: () => void;
  onBack: () => void;
  isProcessing: boolean;
  progress: number;
}

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: "none",
};

export function Step4ScheduleSend({
  name,
  onNameChange,
  template,
  audience,
  onSend,
  onSaveDraft,
  onBack,
  isProcessing,
  progress,
}: Step4Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [estimatedReach, setEstimatedReach] = useState<number>(0);
  const [loadingReach, setLoadingReach] = useState(true);

  useEffect(() => {
    async function calculateReach() {
      setLoadingReach(true);
      try {
        const supabase = createClient();
        if (audience.type === 'all') {
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true });
          setEstimatedReach(count ?? 0);
        } else if (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) {
          const { data: contactTags } = await supabase
            .from('contact_tags')
            .select('contact_id')
            .in('tag_id', audience.tagIds);
          const uniqueIds = new Set((contactTags ?? []).map((ct) => ct.contact_id));
          setEstimatedReach(uniqueIds.size);
        } else if (audience.type === 'csv' && audience.csvContacts) {
          setEstimatedReach(audience.csvContacts.length);
        } else {
          setEstimatedReach(0);
        }
      } finally {
        setLoadingReach(false);
      }
    }
    calculateReach();
  }, [audience]);

  const audienceLabel =
    audience.type === 'all'
      ? 'Todos os Contatos'
      : audience.type === 'tags'
        ? `Tags (${audience.tagIds?.length ?? 0} selecionadas)`
        : audience.type === 'csv'
          ? 'Importação CSV'
          : 'Personalizado';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Revisar e Enviar
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Nomeie o broadcast, revise os detalhes e envie.
        </p>
      </div>

      {/* Nome do broadcast */}
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Nome do Broadcast
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="ex: Anúncio de Promoção de Verão"
          className="h-9 w-full rounded-lg px-3 text-sm"
          style={inputStyle}
        />
      </div>

      {/* Resumo */}
      <div
        className="space-y-3 rounded-xl p-4"
        style={{ border: "1px solid rgba(159,176,201,0.18)", backgroundColor: "rgba(159,176,201,0.04)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Resumo
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Template</p>
            <p style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{template.name}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Audiência</p>
            <p style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{audienceLabel}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Alcance estimado</p>
            <div className="flex items-center gap-1.5">
              {loadingReach ? (
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
              ) : (
                <>
                  <Users className="h-3.5 w-3.5" style={{ color: "var(--ei-cobalt)" }} />
                  <p className="font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {estimatedReach.toLocaleString('pt-BR')}
                  </p>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Idioma</p>
            <p style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{template.language ?? 'pt_BR'}</p>
          </div>
        </div>
      </div>

      {/* Progresso de envio */}
      {isProcessing && (
        <div
          className="rounded-xl p-4"
          style={{ border: "1px solid rgba(43,111,219,0.25)", backgroundColor: "rgba(43,111,219,0.08)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Enviando broadcast…
              </p>
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--ei-cobalt)", fontFamily: "'JetBrains Mono', monospace" }}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: "rgba(159,176,201,0.12)" }}>
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: "var(--ei-cobalt)" }}
            />
          </div>
        </div>
      )}

      <div
        className="flex flex-wrap items-center justify-between gap-2 pt-4"
        style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "rgba(159,176,201,0.08)", border: "1px solid rgba(159,176,201,0.22)", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => { if (!isProcessing) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.14)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={!name.trim() || isProcessing}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "rgba(159,176,201,0.08)", border: "1px solid rgba(159,176,201,0.22)", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (name.trim() && !isProcessing) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
            >
              <Save className="h-4 w-4" />
              Salvar rascunho
            </button>
          )}

          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogTrigger
              render={
                <button
                  type="button"
                  disabled={!name.trim() || isProcessing}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={(e) => { if (name.trim() && !isProcessing) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
                />
              }
            >
              <Send className="h-4 w-4" />
              Enviar Broadcast
            </DialogTrigger>
            <DialogContent style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
              <DialogHeader>
                <DialogTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Confirmar Broadcast
                </DialogTitle>
                <DialogDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Você está prestes a enviar este broadcast para{' '}
                  <span className="font-medium" style={{ color: "var(--ei-offwhite)" }}>
                    {estimatedReach.toLocaleString('pt-BR')}
                  </span>{' '}
                  contatos usando o template{' '}
                  <span className="font-medium" style={{ color: "var(--ei-offwhite)" }}>
                    {template.name}
                  </span>.
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  style={{ backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowConfirm(false); onSend(); }}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
                >
                  <Send className="h-4 w-4" />
                  Confirmar e Enviar
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
