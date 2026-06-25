'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequireRole } from '@/components/auth/require-role';
import { useAuth } from '@/hooks/use-auth';
import {
  API_SCOPES,
  SCOPE_DESCRIPTIONS,
  type ApiScope,
} from '@/lib/api-keys/scopes';
import { SettingsPanelHead } from './settings-panel-head';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function keyStatus(k: ApiKey): 'active' | 'revoked' | 'expired' {
  if (k.revoked_at) return 'revoked';
  if (k.expires_at && new Date(k.expires_at).getTime() <= Date.now())
    return 'expired';
  return 'active';
}

const inputStyle = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export function ApiKeysSettings() {
  const { canEditSettings } = useAuth();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/account/api-keys', { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Falha ao carregar chaves de API');
        return;
      }
      const data = (await res.json()) as { keys: ApiKey[] };
      setKeys(data.keys);
    } catch (err) {
      console.error('[ApiKeysSettings] load error:', err);
      toast.error('Não foi possível alcançar o servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRevoke(key: ApiKey) {
    setRevoking(key.id);
    try {
      const res = await fetch(`/api/account/api-keys/${key.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Falha ao revogar chave');
        return;
      }
      toast.success(`"${key.name}" revogada`);
      setKeys((prev) =>
        prev.map((k) =>
          k.id === key.id ? { ...k, revoked_at: new Date().toISOString() } : k
        )
      );
    } catch (err) {
      console.error('[ApiKeysSettings] revoke error:', err);
      toast.error('Não foi possível alcançar o servidor');
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
      </div>
    );
  }

  return (
    <section className="animate-in fade-in-50 space-y-6 duration-200">
      <SettingsPanelHead
        title="Chaves de API"
        description={
          <>
            As chaves autenticam a API REST pública (
            <code className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>/api/v1</code>) para suas automações. Envie como{' '}
            <code className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Authorization: Bearer &lt;chave&gt;</code>.
          </>
        }
        action={
          <RequireRole min="admin">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
            >
              <Plus className="size-4" />
              Nova chave de API
            </button>
          </RequireRole>
        }
      />

      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center" style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px" }}>
          <KeyRound className="size-6" style={{ color: "var(--ei-text-soft)" }} />
          <p className="mt-2 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Nenhuma chave de API ainda.
          </p>
          {canEditSettings ? (
            <p className="mt-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Clique em <span style={{ color: "var(--ei-offwhite)" }}>Nova chave de API</span> para criar uma.
            </p>
          ) : (
            <p className="mt-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Peça a um admin para criar uma.
            </p>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", overflow: "hidden" }}>
          <ul>
            {keys.map((k, idx) => {
              const status = keyStatus(k);
              const inactive = status !== 'active';
              const isLast = idx === keys.length - 1;
              return (
                <li
                  key={k.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                  style={isLast ? {} : { borderBottom: "1px solid rgba(159,176,201,0.10)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="truncate text-sm font-medium"
                        style={{
                          color: inactive ? "var(--ei-text-soft)" : "var(--ei-offwhite)",
                          textDecoration: inactive ? "line-through" : "none",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {k.name}
                      </span>
                      {status === 'revoked' && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "rgba(159,176,201,0.08)", color: "var(--ei-text-soft)" }}>
                          Revogada
                        </span>
                      )}
                      {status === 'expired' && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "rgba(159,176,201,0.08)", color: "var(--ei-text-soft)" }}>
                          Expirada
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {k.key_prefix}…
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {k.scopes.length === 0 ? (
                        <span className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Sem escopos
                        </span>
                      ) : (
                        k.scopes.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px]"
                            style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "rgba(159,176,201,0.08)", color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Criada em {fmtDate(k.created_at)}
                      {' · '}
                      {k.last_used_at
                        ? `último uso ${fmtDate(k.last_used_at)}`
                        : 'nunca usada'}
                      {k.expires_at && status !== 'expired'
                        ? ` · expira em ${fmtDate(k.expires_at)}`
                        : ''}
                    </p>
                  </div>

                  {status === 'active' && (
                    <RequireRole min="admin">
                      <button
                        type="button"
                        onClick={() => handleRevoke(k)}
                        disabled={revoking === k.id}
                        className="self-start inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 sm:self-auto"
                        style={{ border: "1px solid rgba(248,113,113,0.40)", backgroundColor: "rgba(248,113,113,0.10)", color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        onMouseEnter={(e) => { if (revoking !== k.id) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.20)"; (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5"; } }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.10)"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                      >
                        {revoking === k.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Revogar
                      </button>
                    </RequireRole>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={load}
      />
    </section>
  );
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiScope[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  function reset() {
    setName('');
    setScopes([]);
    setSubmitting(false);
    setCreatedKey(null);
  }

  function toggleScope(scope: ApiScope, checked: boolean) {
    setScopes((prev) =>
      checked ? [...prev, scope] : prev.filter((s) => s !== scope)
    );
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Dê um nome à chave');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/account/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, scopes }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || 'Falha ao criar chave');
        return;
      }
      setCreatedKey(payload.plaintext as string);
      onCreated();
    } catch (err) {
      console.error('[CreateKeyDialog] create error:', err);
      toast.error('Não foi possível alcançar o servidor');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey() {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      toast.success('Chave de API copiada');
    } catch {
      toast.error('Falha ao copiar — selecione e copie manualmente');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Copie sua chave de API
              </DialogTitle>
              <DialogDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Esta é a única vez que a chave completa é exibida. Guarde-a em lugar seguro — se perder, revogue e crie uma nova.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Chave de API</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={createdKey}
                  onFocus={(e) => e.currentTarget.select()}
                  style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}
                />
                <button
                  type="button"
                  onClick={copyKey}
                  className="inline-flex items-center gap-2 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
                >
                  <Copy className="size-4" />
                  Copiar
                </button>
              </div>
            </div>

            <DialogFooter style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
              <button
                type="button"
                onClick={() => { reset(); onOpenChange(false); }}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
              >
                Concluído
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Nova chave de API
              </DialogTitle>
              <DialogDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Nomeie-a com a integração que irá usá-la, e conceda apenas os escopos necessários.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="api-key-name" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Nome
                </Label>
                <Input
                  id="api-key-name"
                  value={name}
                  maxLength={80}
                  placeholder="ex. Integração Zapier"
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Escopos</Label>
                <div className="space-y-2 rounded-lg p-3" style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "rgba(159,176,201,0.04)" }}>
                  {API_SCOPES.map((scope) => (
                    <label
                      key={scope}
                      className="flex cursor-pointer items-start gap-2.5"
                    >
                      <Checkbox
                        checked={scopes.includes(scope)}
                        onCheckedChange={(checked) =>
                          toggleScope(scope, checked === true)
                        }
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs" style={{ color: "var(--ei-offwhite)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {scope}
                        </span>
                        <span className="block text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {SCOPE_DESCRIPTIONS[scope]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Uma chave sem escopos ainda pode chamar{' '}
                  <code className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GET /api/v1/me</code> para verificar se funciona.
                </p>
              </div>
            </div>

            <DialogFooter style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
              <button
                type="button"
                onClick={() => { reset(); onOpenChange(false); }}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  'Criar chave'
                )}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
