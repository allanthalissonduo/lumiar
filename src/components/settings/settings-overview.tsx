'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { THEMES } from '@/lib/themes';
import { CURRENCIES } from '@/lib/currency';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { SECTION_META, type SettingsSection } from './settings-sections';
import { SettingsChip, StatusDot } from './settings-chip';
import { ROLE_META } from './role-meta';

interface OverviewCounts {
  members: number | null;
  pendingInvites: number | null;
  templates: number | null;
  templatesPending: number | null;
  tags: number | null;
  customFields: number | null;
}

interface WhatsAppStatus {
  configured: boolean;
  connected: boolean;
}

export function SettingsOverview({
  onSelect,
}: {
  onSelect: (section: SettingsSection) => void;
}) {
  const { user, profile, accountId, accountRole, defaultCurrency, canManageMembers } =
    useAuth();
  const { mode, theme } = useTheme();

  const [counts, setCounts] = useState<OverviewCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(true);

  useEffect(() => {
    if (!user || !accountId) return;
    let cancelled = false;
    const supabase = createClient();
    const userId = user.id;
    const acctId = accountId;

    (async () => {
      setCountsLoading(true);
      const [membersRes, invitesRes, templatesTotal, templatesPending, tagsRes, fieldsRes] =
        await Promise.allSettled([
          fetch('/api/account/members', { cache: 'no-store' }).then((r) => r.json()),
          canManageMembers
            ? fetch('/api/account/invitations', { cache: 'no-store' }).then((r) =>
                r.json(),
              )
            : Promise.resolve(null),
          supabase
            .from('message_templates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('message_templates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'PENDING'),
          supabase
            .from('tags')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase.from('custom_fields').select('id', { count: 'exact', head: true }),
        ]);

      if (cancelled) return;

      const members =
        membersRes.status === 'fulfilled' && Array.isArray(membersRes.value?.members)
          ? membersRes.value.members.length
          : null;
      const pendingInvites =
        invitesRes.status === 'fulfilled' &&
        invitesRes.value &&
        Array.isArray(invitesRes.value.invitations)
          ? invitesRes.value.invitations.length
          : null;

      setCounts({
        members,
        pendingInvites,
        templates:
          templatesTotal.status === 'fulfilled'
            ? templatesTotal.value.count ?? null
            : null,
        templatesPending:
          templatesPending.status === 'fulfilled'
            ? templatesPending.value.count ?? null
            : null,
        tags: tagsRes.status === 'fulfilled' ? tagsRes.value.count ?? null : null,
        customFields:
          fieldsRes.status === 'fulfilled' ? fieldsRes.value.count ?? null : null,
      });
      setCountsLoading(false);
    })();

    (async () => {
      setWhatsappLoading(true);
      const [row, health] = await Promise.allSettled([
        supabase
          .from('whatsapp_config')
          .select('phone_number_id')
          .eq('account_id', acctId)
          .maybeSingle(),
        fetch('/api/whatsapp/config', { cache: 'no-store' }).then((r) => r.json()),
      ]);
      if (cancelled) return;
      setWhatsapp({
        configured: row.status === 'fulfilled' && !!row.value.data?.phone_number_id,
        connected: health.status === 'fulfilled' && !!health.value?.connected,
      });
      setWhatsappLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, accountId, canManageMembers]);

  const displayName = profile?.full_name || profile?.email || 'Sua conta';
  const initial = (profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase();
  const roleMeta = accountRole ? ROLE_META[accountRole] : null;
  const RoleIcon = roleMeta?.icon;

  const currencyLabel =
    CURRENCIES.find((c) => c.code === defaultCurrency)?.label ?? defaultCurrency;
  const themeName = THEMES.find((t) => t.id === theme)?.name ?? theme;
  const modeLabel = mode === 'dark' ? 'Escuro' : mode === 'light' ? 'Claro' : mode;

  const tiles: {
    section: SettingsSection;
    loading: boolean;
    subtitle: ReactNode;
  }[] = [
    {
      section: 'whatsapp',
      loading: whatsappLoading,
      subtitle: !whatsapp?.configured ? (
        'Ainda não configurado'
      ) : whatsapp.connected ? (
        <>
          <StatusDot tone="ok" /> Conectado
        </>
      ) : (
        <>
          <StatusDot tone="muted" /> Precisa reconectar
        </>
      ),
    },
    {
      section: 'members',
      loading: countsLoading,
      subtitle:
        counts?.members == null
          ? 'Ver membros da equipe'
          : `${counts.members} membro${counts.members === 1 ? '' : 's'}${
              counts.pendingInvites
                ? ` · ${counts.pendingInvites} convite${
                    counts.pendingInvites === 1 ? '' : 's'
                  } pendente${counts.pendingInvites === 1 ? '' : 's'}`
                : ''
            }`,
    },
    {
      section: 'templates',
      loading: countsLoading,
      subtitle:
        counts?.templates == null
          ? 'Gerenciar templates de mensagem'
          : `${counts.templates} template${counts.templates === 1 ? '' : 's'}${
              counts.templatesPending
                ? ` · ${counts.templatesPending} em revisão`
                : ''
            }`,
    },
    {
      section: 'deals',
      loading: false,
      subtitle: `${defaultCurrency} — ${currencyLabel}`,
    },
    {
      section: 'fields',
      loading: countsLoading,
      subtitle:
        counts?.tags == null && counts?.customFields == null
          ? 'Tags e campos personalizados'
          : `${counts?.tags ?? 0} tag${counts?.tags === 1 ? '' : 's'} · ${
              counts?.customFields ?? 0
            } campo${counts?.customFields === 1 ? '' : 's'} personalizado${counts?.customFields === 1 ? '' : 's'}`,
    },
    {
      section: 'appearance',
      loading: false,
      subtitle: `${modeLabel} · ${themeName}`,
    },
  ];

  return (
    <section className="animate-in fade-in-50 duration-200">
      {/* Identidade */}
      <div
        className="flex flex-row items-center gap-4 px-5 py-5"
        style={{
          backgroundColor: "rgba(159,176,201,0.04)",
          border: "1px solid rgba(159,176,201,0.16)",
          borderRadius: "12px",
        }}
      >
        <Avatar size="lg" className="size-14">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={displayName} />
          ) : null}
          <AvatarFallback
            className="text-xl"
            style={{ backgroundColor: "rgba(43,111,219,0.14)", color: "var(--ei-cobalt)" }}
          >
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-base font-semibold"
            style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {displayName}
          </div>
          {profile?.email ? (
            <div
              className="truncate text-sm"
              style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {profile.email}
            </div>
          ) : null}
        </div>
        {roleMeta && RoleIcon ? (
          <SettingsChip variant={roleMeta.variant}>
            <RoleIcon />
            {roleMeta.label}
          </SettingsChip>
        ) : null}
      </div>

      {/* Tiles de seção */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(({ section, loading, subtitle }) => {
          const meta = SECTION_META[section];
          const Icon = meta.icon;
          return (
            <button
              key={section}
              type="button"
              onClick={() => onSelect(section)}
              className="group flex items-start gap-3.5 rounded-xl p-4 text-left transition-colors"
              style={{ backgroundColor: "var(--ei-surface-card)", border: "1px solid rgba(159,176,201,0.18)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(43,111,219,0.40)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(159,176,201,0.18)"; }}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: "rgba(43,111,219,0.12)", color: "var(--ei-cobalt)" }}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-sm font-semibold"
                  style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {meta.label}
                </span>
                <span
                  className="mt-0.5 flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3 animate-spin" /> Carregando…
                    </>
                  ) : (
                    subtitle
                  )}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ color: "var(--ei-text-soft)" }}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
