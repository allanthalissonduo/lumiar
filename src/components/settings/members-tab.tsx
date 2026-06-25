'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Loader2,
  Mail,
  MailX,
  Plus,
  Trash2,
  UsersRound,
} from 'lucide-react';

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequireRole } from '@/components/auth/require-role';
import { useAuth } from '@/hooks/use-auth';
import { usePresence } from '@/hooks/use-presence';
import type { AccountRole } from '@/lib/auth/roles';
import { presenceLabel, summarize } from '@/lib/presence';
import {
  PRESENCE_DOT_CLASS,
  PresenceDot,
} from '@/components/presence/presence-dot';
import { InviteMemberDialog } from './invite-member-dialog';
import { SettingsPanelHead } from './settings-panel-head';
import { ROLE_META } from './role-meta';

interface Member {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: AccountRole;
  joined_at: string;
}

interface Invitation {
  id: string;
  role: 'admin' | 'agent' | 'viewer';
  label: string | null;
  created_at: string;
  expires_at: string;
}

const EDITABLE_ROLES: { value: AccountRole; label: string; hint: string }[] = [
  { value: 'admin', label: 'Admin', hint: 'Gerenciar membros + tudo' },
  { value: 'agent', label: 'Agente', hint: 'Usar recursos; sem configurações' },
  { value: 'viewer', label: 'Visualizador', hint: 'Somente leitura' },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtExpiresIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expirado';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `expira em ${days} dia${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.floor(ms / (60 * 60 * 1000)));
  return `expira em ${hours} hora${hours === 1 ? '' : 's'}`;
}

const selectTriggerStyle = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export function MembersTab() {
  const { user, canManageMembers } = useAuth();
  const { getPresence, getRow, now } = usePresence();

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<Member | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<string | null>(null);

  const loadEverything = useCallback(async () => {
    try {
      const [mres, ires] = await Promise.all([
        fetch('/api/account/members', { cache: 'no-store' }),
        canManageMembers
          ? fetch('/api/account/invitations', { cache: 'no-store' })
          : Promise.resolve(null),
      ]);

      if (!mres.ok) {
        const payload = await mres.json().catch(() => ({}));
        toast.error(payload.error || 'Falha ao carregar membros');
        return;
      }
      const mdata = (await mres.json()) as { members: Member[] };
      setMembers(mdata.members);

      if (ires) {
        if (!ires.ok) {
          const payload = await ires.json().catch(() => ({}));
          toast.error(payload.error || 'Falha ao carregar convites');
          return;
        }
        const idata = (await ires.json()) as { invitations: Invitation[] };
        setInvitations(idata.invitations);
      } else {
        setInvitations([]);
      }
    } catch (err) {
      console.error('[MembersTab] load error:', err);
      toast.error('Não foi possível alcançar o servidor');
    } finally {
      setLoading(false);
    }
  }, [canManageMembers]);

  useEffect(() => {
    void loadEverything();
  }, [loadEverything]);

  async function handleRoleChange(member: Member, nextRole: AccountRole) {
    if (member.role === nextRole) return;
    const previousRole = member.role;
    setPendingMemberAction(member.user_id);
    setMembers((prev) =>
      prev.map((m) =>
        m.user_id === member.user_id ? { ...m, role: nextRole } : m,
      ),
    );
    try {
      const res = await fetch(`/api/account/members/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === member.user_id ? { ...m, role: previousRole } : m,
          ),
        );
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Falha ao atualizar função');
        return;
      }
      toast.success(`${member.full_name || 'Membro'} atualizado para ${nextRole}`);
    } catch (err) {
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === member.user_id ? { ...m, role: previousRole } : m,
        ),
      );
      console.error('[MembersTab] role change error:', err);
      toast.error('Não foi possível alcançar o servidor');
    } finally {
      setPendingMemberAction(null);
    }
  }

  async function handleRemove() {
    if (!removingMember) return;
    setPendingMemberAction(removingMember.user_id);
    try {
      const res = await fetch(
        `/api/account/members/${removingMember.user_id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Falha ao remover membro');
        return;
      }
      toast.success(`${removingMember.full_name || 'Membro'} removido`);
      setMembers((prev) =>
        prev.filter((m) => m.user_id !== removingMember.user_id),
      );
      setRemovingMember(null);
    } catch (err) {
      console.error('[MembersTab] remove error:', err);
      toast.error('Não foi possível alcançar o servidor');
    } finally {
      setPendingMemberAction(null);
    }
  }

  async function handleRevoke(invite: Invitation) {
    try {
      const res = await fetch(`/api/account/invitations/${invite.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Falha ao revogar convite');
        return;
      }
      toast.success('Convite revogado');
      setInvitations((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      console.error('[MembersTab] revoke error:', err);
      toast.error('Não foi possível alcançar o servidor');
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
        title="Membros da equipe"
        description="Pessoas com acesso a esta conta. As funções controlam o que cada membro pode fazer."
        action={
          <RequireRole min="admin">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
            >
              <Plus className="size-4" />
              Convidar membro
            </button>
          </RequireRole>
        }
      />

      {members.length > 0 &&
        (() => {
          const counts = summarize(members.map((m) => getPresence(m.user_id)));
          return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <span className="inline-flex items-center gap-1.5">
                <PresenceDot status="online" />
                {counts.online} online
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PresenceDot status="away" />
                {counts.away} ausente
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PresenceDot status="offline" />
                {counts.offline} offline
              </span>
              <span style={{ color: "rgba(159,176,201,0.50)" }}>
                · {members.length} membro{members.length === 1 ? '' : 's'}
              </span>
            </div>
          );
        })()}

      {/* Roster */}
      <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", overflow: "hidden" }}>
        <ul>
          {members.map((member, idx) => {
            const roleMeta = ROLE_META[member.role];
            const RoleIcon = roleMeta.icon;
            const isSelf = member.user_id === user?.id;
            const isOwnerRow = member.role === 'owner';
            const isBusy = pendingMemberAction === member.user_id;
            const presence = getPresence(member.user_id);
            const presenceRow = getRow(member.user_id);
            const presenceText = presenceLabel(
              presence,
              presenceRow?.last_seen_at ?? null,
              now,
            );
            const isLast = idx === members.length - 1;

            return (
              <li
                key={member.user_id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                style={isLast ? {} : { borderBottom: "1px solid rgba(159,176,201,0.10)" }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Avatar className="size-9 shrink-0">
                          {member.avatar_url ? (
                            <AvatarImage
                              src={member.avatar_url}
                              alt={member.full_name || 'Member'}
                            />
                          ) : null}
                          <AvatarFallback style={{ backgroundColor: "rgba(43,111,219,0.14)", color: "var(--ei-cobalt)", fontSize: "13px", fontWeight: 600 }}>
                            {(member.full_name || member.email || 'U')
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                          <AvatarBadge
                            role="img"
                            aria-label={presenceText}
                            className={PRESENCE_DOT_CLASS[presence]}
                          />
                        </Avatar>
                      }
                    />
                    <TooltipContent>{presenceText}</TooltipContent>
                  </Tooltip>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {member.full_name || 'Sem nome'}
                      </span>
                      {isSelf && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "rgba(159,176,201,0.08)", color: "var(--ei-text-soft)" }}>
                          Você
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <p className="truncate text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="hidden sm:block text-right text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Entrou em {fmtDate(member.joined_at)}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  {canManageMembers && !isOwnerRow && !isSelf ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        v && handleRoleChange(member, v as AccountRole)
                      }
                    >
                      <SelectTrigger
                        className="w-32"
                        disabled={isBusy}
                        style={selectTriggerStyle}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
                        {EDITABLE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${roleMeta.className}`}
                    >
                      <RoleIcon className="size-3.5" />
                      {roleMeta.label}
                    </span>
                  )}

                  {canManageMembers && !isOwnerRow && !isSelf && (
                    <button
                      type="button"
                      onClick={() => setRemovingMember(member)}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 transition-colors disabled:opacity-50"
                      style={{ border: "1px solid rgba(248,113,113,0.40)", backgroundColor: "rgba(248,113,113,0.10)", color: "#f87171" }}
                      onMouseEnter={(e) => { if (!isBusy) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.20)"; (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5"; } }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.10)"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pending invitations — admin+ only */}
      <RequireRole min="admin">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <UsersRound className="size-4" style={{ color: "var(--ei-text-soft)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Convites pendentes
            </h3>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs" style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "rgba(159,176,201,0.08)", color: "var(--ei-text-soft)" }}>
              {invitations.length}
            </span>
          </div>
          {invitations.length > 0 ? (
            <p className="mb-3 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              A URL do convite é exibida apenas uma vez na criação — para reenviar, revogue o convite abaixo e crie um novo.
            </p>
          ) : null}

          {invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center" style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px" }}>
              <Mail className="size-6" style={{ color: "var(--ei-text-soft)" }} />
              <p className="mt-2 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Nenhum convite pendente.
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Clique em <span style={{ color: "var(--ei-offwhite)" }}>Convidar membro</span>{' '}
                acima para gerar um link compartilhável.
              </p>
            </div>
          ) : (
            <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", overflow: "hidden" }}>
              <ul>
                {invitations.map((inv, idx) => {
                  const inviteRoleMeta = ROLE_META[inv.role];
                  const InviteRoleIcon = inviteRoleMeta.icon;
                  const isLast = idx === invitations.length - 1;
                  return (
                    <li
                      key={inv.id}
                      className="flex items-center gap-4 px-4 py-3"
                      style={isLast ? {} : { borderBottom: "1px solid rgba(159,176,201,0.10)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {inv.label || 'Convite sem título'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${inviteRoleMeta.className}`}
                          >
                            <InviteRoleIcon className="size-3" />
                            {inviteRoleMeta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Criado em {fmtDate(inv.created_at)} · {fmtExpiresIn(inv.expires_at)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevoke(inv)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ border: "1px solid rgba(248,113,113,0.40)", backgroundColor: "rgba(248,113,113,0.10)", color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.20)"; (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.10)"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                      >
                        <MailX className="size-4" />
                        Revogar
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </RequireRole>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onCreated={loadEverything}
      />

      <Dialog
        open={removingMember !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
      >
        <DialogContent className="sm:max-w-sm" style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <AlertTriangle className="size-4" style={{ color: "#fbbf24" }} />
              Remover membro
            </DialogTitle>
            <DialogDescription style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Remover{' '}
              <span className="font-medium" style={{ color: "var(--ei-offwhite)" }}>
                {removingMember?.full_name || 'este membro'}
              </span>{' '}
              da conta? Ele será desconectado e receberá uma conta pessoal no próximo login. O login não é excluído.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter style={{ borderTop: "1px solid rgba(159,176,201,0.14)" }}>
            <button
              type="button"
              onClick={() => setRemovingMember(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={!!pendingMemberAction}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#dc2626", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!pendingMemberAction) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#b91c1c"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#dc2626"; }}
            >
              {pendingMemberAction ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover membro'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
