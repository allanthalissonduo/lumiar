'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, LogOut } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function SessionsCard() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const onConfirm = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        toast.error(`Falha ao sair: ${error.message}`);
        return;
      }
      window.location.href = '/login';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(msg);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", padding: "20px" }}>
        <div className="flex items-center gap-2 mb-1">
          <LogOut className="size-4" style={{ color: "var(--ei-cobalt)" }} />
          <p className="font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sessões ativas</p>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Saia de todos os dispositivos onde você está conectado — incluindo este. Útil se você perdeu um laptop ou compartilhou sua senha.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
        >
          <LogOut className="size-4" />
          Sair de todos os dispositivos
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sair de todos os lugares?</DialogTitle>
            <DialogDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Todos os dispositivos conectados a esta conta serão desconectados e precisarão fazer login novamente. Você será redirecionado para a página de login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={signingOut}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!signingOut) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
            >
              {signingOut ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saindo…
                </>
              ) : (
                'Sair de todos os lugares'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
