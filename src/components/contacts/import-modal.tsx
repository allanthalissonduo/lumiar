'use client';

import React, { useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  dedupeByPhone,
  isUniqueViolation,
  normalizeKey,
} from '@/lib/contacts/dedupe';
import {
  parseContactCsv,
  type ParsedContactRow,
} from '@/lib/contacts/parse-contact-csv';
import {
  assignImportedContactTags,
  resolveImportTagIds,
  type ContactTagAssignment,
} from '@/lib/contacts/resolve-import-tags';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Tag,
} from 'lucide-react';

const DEFAULT_TAG_COLOR = '#3b82f6';
const PREVIEW_LIMIT = 5;

function truncateFilename(name: string, max = 48): string {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const base = name.slice(0, name.length - ext.length);
  const keep = max - ext.length - 1;
  return `${base.slice(0, Math.max(keep, 12))}…${ext}`;
}

function PreviewCell({
  value,
  mono,
  maxWidth = 'max-w-[9rem]',
}: {
  value: string;
  mono?: boolean;
  maxWidth?: string;
}) {
  return (
    <span
      className={`block truncate ${maxWidth}`}
      style={mono ? { fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" } : undefined}
      title={value}
    >
      {value}
    </span>
  );
}

function ImportPreviewTags({
  tagNames,
  tagColorByKey,
}: {
  tagNames: string[];
  tagColorByKey: Map<string, string>;
}) {
  if (tagNames.length === 0) {
    return <span style={{ color: "var(--ei-text-soft)" }}>—</span>;
  }
  return (
    <div className="flex min-w-[4.5rem] flex-wrap gap-1">
      {tagNames.map((name) => {
        const color = tagColorByKey.get(name.trim().toLowerCase()) ?? DEFAULT_TAG_COLOR;
        const isKnown = tagColorByKey.has(name.trim().toLowerCase());
        return (
          <span
            key={name}
            className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none"
            style={{
              backgroundColor: `${color}18`,
              color,
              border: `1px solid ${color}${isKnown ? '55' : '30'}`,
            }}
            title={isKnown ? name : `${name} (será criada na importação)`}
          >
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{name}</span>
          </span>
        );
      })}
    </div>
  );
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportModal({ open, onOpenChange, onImported }: ImportModalProps) {
  const supabase = createClient();
  const { accountId, canEditSettings } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedContactRow[]>([]);
  const [hasTagsColumn, setHasTagsColumn] = useState(false);
  const [hasCompanyColumn, setHasCompanyColumn] = useState(false);
  const [tagColorByKey, setTagColorByKey] = useState<Map<string, string>>(new Map());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number; skipped: number; failed: number; tagsAssigned: number;
  } | null>(null);

  function reset() {
    setFile(null);
    setParsedRows([]);
    setHasTagsColumn(false);
    setHasCompanyColumn(false);
    setTagColorByKey(new Map());
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    const text = await selected.text();
    const { rows, hasTagsColumn: csvHasTags, hasCompanyColumn: csvHasCompany } = parseContactCsv(text);
    if (rows.length === 0) {
      toast.error('Nenhuma linha válida encontrada. O CSV deve ter uma coluna "phone".');
      setParsedRows([]);
      setHasTagsColumn(false);
      setHasCompanyColumn(false);
      setTagColorByKey(new Map());
      return;
    }
    setParsedRows(rows);
    setHasTagsColumn(csvHasTags);
    setHasCompanyColumn(csvHasCompany);
    if (csvHasTags && accountId) {
      const { data: tags } = await supabase.from('tags').select('name, color').eq('account_id', accountId);
      const colors = new Map<string, string>();
      for (const tag of tags ?? []) {
        const key = tag.name.trim().toLowerCase();
        if (!colors.has(key)) colors.set(key, tag.color);
      }
      setTagColorByKey(colors);
    } else {
      setTagColorByKey(new Map());
    }
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      if (!accountId) throw new Error('Your profile is not linked to an account.');

      let imported = 0, skipped = 0, failed = 0;
      const { unique, duplicates: inFileDupes } = dedupeByPhone(parsedRows);
      skipped += inFileDupes;

      const { data: existingRows } = await supabase
        .from('contacts').select('phone_normalized').eq('account_id', accountId);
      const existing = new Set(
        (existingRows ?? [])
          .map((r) => (r as { phone_normalized: string | null }).phone_normalized)
          .filter((p): p is string => !!p)
      );

      const toInsert = unique.filter((row) => {
        if (existing.has(normalizeKey(row.phone))) { skipped++; return false; }
        return true;
      });

      const allTagNames = toInsert.flatMap((row) => row.tagNames);
      let tagIdByKey = new Map<string, string>();
      let skippedNames: string[] = [];
      if (allTagNames.length > 0) {
        ({ tagIdByKey, skippedNames } = await resolveImportTagIds(supabase, {
          accountId, userId: user.id, tagNames: allTagNames, canCreateTags: canEditSettings,
        }));
      }

      const tagAssignments: ContactTagAssignment[] = [];
      const chunkSize = 50;

      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const rows = chunk.map((row) => ({
          user_id: user.id, account_id: accountId,
          phone: row.phone, name: row.name || null, email: row.email || null, company: row.company || null,
        }));
        const { data, error } = await supabase.from('contacts').insert(rows).select('id');
        if (error) {
          for (let j = 0; j < rows.length; j++) {
            const row = rows[j];
            const source = chunk[j];
            const { data: singleData, error: singleErr } = await supabase.from('contacts').insert(row).select('id').single();
            if (!singleErr && singleData) {
              imported++;
              if (source.tagNames.length > 0) tagAssignments.push({ contactId: singleData.id, tagNames: source.tagNames });
            } else if (isUniqueViolation(singleErr)) {
              skipped++;
            } else {
              failed++;
            }
          }
        } else {
          const inserted = data ?? [];
          imported += inserted.length;
          for (let j = 0; j < inserted.length; j++) {
            const source = chunk[j];
            if (!source || source.tagNames.length === 0) continue;
            tagAssignments.push({ contactId: inserted[j].id, tagNames: source.tagNames });
          }
        }
      }

      let tagsAssigned = 0;
      try {
        tagsAssigned = await assignImportedContactTags(supabase, tagAssignments, tagIdByKey);
      } catch {
        toast.warning('Contatos importados, mas algumas tags não foram atribuídas.');
      }

      setResult({ imported, skipped, failed, tagsAssigned });
      if (imported > 0) { toast.success(`${imported} contato${imported !== 1 ? 's' : ''} importado${imported !== 1 ? 's' : ''}`); onImported(); }
      if (tagsAssigned > 0) toast.success(`${tagsAssigned} tag${tagsAssigned !== 1 ? 's' : ''} atribuída${tagsAssigned !== 1 ? 's' : ''}`);
      if (skippedNames.length > 0) {
        const sample = skippedNames.slice(0, 3).join(', ');
        const more = skippedNames.length > 3 ? ` (+${skippedNames.length - 3} mais)` : '';
        toast.info(`Tags desconhecidas ignoradas (crie nas Configurações): ${sample}${more}`);
      }
      if (skipped > 0) toast.info(`${skipped} duplicata${skipped !== 1 ? 's' : ''} ignorada${skipped !== 1 ? 's' : ''}`);
      if (failed > 0) toast.error(`${failed} contato${failed !== 1 ? 's' : ''} falharam na importação`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Importação falhou');
    } finally {
      setImporting(false);
    }
  }

  const preview = parsedRows.slice(0, PREVIEW_LIMIT);
  const previewHasTags = hasTagsColumn || preview.some((row) => row.tagNames.length > 0);
  const previewHasCompany = hasCompanyColumn && preview.some((row) => row.company?.trim());

  const tagStats = useMemo(() => {
    const names = new Set<string>();
    let rowsWithTags = 0;
    for (const row of parsedRows) {
      if (row.tagNames.length === 0) continue;
      rowsWithTags++;
      for (const name of row.tagNames) names.add(name.trim().toLowerCase());
    }
    return { unique: names.size, rowsWithTags };
  }, [parsedRows]);

  const codeStyle: React.CSSProperties = {
    borderRadius: "4px",
    backgroundColor: "rgba(159,176,201,0.10)",
    color: "var(--ei-cobalt)",
    padding: "1px 4px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}
      >
        <div className="shrink-0 space-y-4 px-6 pb-5 pt-6" style={{ borderBottom: "1px solid rgba(159,176,201,0.14)" }}>
          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-lg" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Importar Contatos
            </DialogTitle>
            <DialogDescription className="leading-relaxed" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Faça upload de um CSV com a coluna obrigatória{' '}
              <code style={codeStyle}>phone</code>. Opcionais:{' '}
              <code style={codeStyle}>name</code>,{' '}
              <code style={codeStyle}>email</code>,{' '}
              <code style={codeStyle}>company</code>,{' '}
              <code style={codeStyle}>tags</code>{' '}
              (separadas por vírgula; use aspas para células com múltiplas tags).
            </DialogDescription>
          </DialogHeader>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl p-5 transition-all"
            style={file
              ? { border: "1px dashed rgba(43,111,219,0.50)", backgroundColor: "rgba(43,111,219,0.06)" }
              : { border: "1px dashed rgba(159,176,201,0.28)", backgroundColor: "rgba(159,176,201,0.04)" }}
            onMouseEnter={(e) => { if (!file) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(43,111,219,0.45)"; }}
            onMouseLeave={(e) => { if (!file) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(159,176,201,0.28)"; }}
          >
            {file ? (
              <>
                <div className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(43,111,219,0.15)" }}>
                  <FileText className="size-5" style={{ color: "var(--ei-cobalt)" }} />
                </div>
                <p className="max-w-full truncate px-2 text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }} title={file.name}>
                  {truncateFilename(file.name)}
                </p>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: "rgba(159,176,201,0.10)", color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {parsedRows.length} linha{parsedRows.length !== 1 ? 's' : ''} prontas
                </span>
              </>
            ) : (
              <>
                <div className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(159,176,201,0.08)" }}>
                  <Upload className="size-5" style={{ color: "var(--ei-text-soft)" }} />
                </div>
                <p className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Clique para escolher um arquivo CSV
                </p>
                <p className="text-[11px]" style={{ color: "var(--ei-text-soft)" }}>
                  .csv até o limite do navegador
                </p>
              </>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {preview.length > 0 && !result && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                  Pré-visualização · primeiras {preview.length}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {tagStats.rowsWithTags > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]" style={{ backgroundColor: "rgba(159,176,201,0.08)", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <Tag className="size-3" style={{ color: "var(--ei-cobalt)" }} />
                      {tagStats.unique} tag{tagStats.unique !== 1 ? 's' : ''} · {tagStats.rowsWithTags} contato{tagStats.rowsWithTags !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(159,176,201,0.16)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(159,176,201,0.14)", backgroundColor: "rgba(159,176,201,0.04)" }}>
                        {["Telefone","Nome","Email", ...(previewHasCompany ? ["Empresa"] : []), ...(previewHasTags ? ["Tags"] : [])].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr
                          key={i}
                          style={i < preview.length - 1 ? { borderBottom: "1px solid rgba(159,176,201,0.08)" } : {}}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(159,176,201,0.04)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}
                        >
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--ei-text-soft)" }}>
                            <PreviewCell value={row.phone} mono maxWidth="max-w-[7.5rem]" />
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--ei-offwhite)" }}>
                            <PreviewCell value={row.name || '—'} maxWidth="max-w-[8.5rem]" />
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--ei-text-soft)" }}>
                            <PreviewCell value={row.email || '—'} maxWidth="max-w-[10rem]" />
                          </td>
                          {previewHasCompany && (
                            <td className="px-3 py-2" style={{ color: "var(--ei-text-soft)" }}>
                              <PreviewCell value={row.company || '—'} maxWidth="max-w-[7rem]" />
                            </td>
                          )}
                          {previewHasTags && (
                            <td className="px-3 py-2 align-top">
                              <ImportPreviewTags tagNames={row.tagNames} tagColorByKey={tagColorByKey} />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {parsedRows.length > PREVIEW_LIMIT && (
                <p className="text-center text-[11px]" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  + {parsedRows.length - PREVIEW_LIMIT} linha{parsedRows.length - PREVIEW_LIMIT !== 1 ? 's' : ''} não exibidas
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-xl p-4" style={{ border: "1px solid rgba(159,176,201,0.16)", backgroundColor: "rgba(159,176,201,0.04)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Importação concluída</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {result.imported > 0 && (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--ei-iris)" }}>
                    <CheckCircle className="size-4 shrink-0" />
                    {result.imported} importado{result.imported !== 1 ? 's' : ''}
                  </div>
                )}
                {result.tagsAssigned > 0 && (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--ei-cobalt)" }}>
                    <CheckCircle className="size-4 shrink-0" />
                    {result.tagsAssigned} tag{result.tagsAssigned !== 1 ? 's' : ''} atribuída{result.tagsAssigned !== 1 ? 's' : ''}
                  </div>
                )}
                {result.skipped > 0 && (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "#fbbf24" }}>
                    <AlertTriangle className="size-4 shrink-0" />
                    {result.skipped} ignorado{result.skipped !== 1 ? 's' : ''}
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "#f87171" }}>
                    <XCircle className="size-4 shrink-0" />
                    {result.failed} falha{result.failed !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-0 shrink-0 gap-2 px-6 py-4 sm:justify-end" style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
          >
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              type="button"
              disabled={parsedRows.length === 0 || importing}
              onClick={handleImport}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (parsedRows.length > 0 && !importing) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
            >
              {importing && <Loader2 className="size-4 animate-spin" />}
              Importar {parsedRows.length > 0 ? parsedRows.length : ''} contato{parsedRows.length !== 1 ? 's' : ''}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
