'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PASSWORD = 8;

const inputStyle = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export function PasswordForm() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email) {
      toast.error('Não é possível alterar a senha sem um e-mail atual');
      return;
    }
    if (next.length < MIN_PASSWORD) {
      setConfirmError(`A senha deve ter pelo menos ${MIN_PASSWORD} caracteres`);
      return;
    }
    if (next !== confirm) {
      setConfirmError('A nova senha e a confirmação não coincidem');
      return;
    }
    setConfirmError(null);
    setSaving(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: current,
      });
      if (signInError) {
        toast.error('Senha atual incorreta');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        toast.error(`Falha ao atualizar senha: ${updateError.message}`);
        return;
      }

      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success('Senha atualizada');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", padding: "20px" }}>
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="size-4" style={{ color: "var(--ei-cobalt)" }} />
        <p className="font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Senha</p>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Use pelo menos {MIN_PASSWORD} caracteres. Você continuará conectado neste dispositivo após a alteração.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Senha atual
          </Label>
          <Input
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            disabled={saving}
            required
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-password" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nova senha
            </Label>
            <Input
              id="new-password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              disabled={saving}
              required
              style={inputStyle}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Confirmar nova senha
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              disabled={saving}
              required
              style={inputStyle}
            />
          </div>
        </div>

        {confirmError && (
          <p className="rounded-md px-3 py-2 text-xs" style={{ border: "1px solid rgba(248,113,113,0.30)", backgroundColor: "rgba(248,113,113,0.10)", color: "#fca5a5", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {confirmError}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !current || !next || !confirm}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={(e) => { if (!saving && current && next && confirm) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Atualizando…
              </>
            ) : (
              'Atualizar senha'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
