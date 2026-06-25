'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, Mail, CircleAlert } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { SettingsPanelHead } from './settings-panel-head';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputStyle = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailChangePending, setEmailChangePending] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setEmail(profile.email ?? '');
  }, [profile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const currentAvatar =
    previewUrl ?? (!removeAvatar ? profile?.avatar_url ?? null : null);

  const initial = (fullName || profile?.full_name || profile?.email || 'U')
    .charAt(0)
    .toUpperCase();

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_MIME.has(file.type)) {
      toast.error('Tipo de imagem não suportado', { description: 'Use PNG, JPG, WebP ou GIF.' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Imagem muito grande', { description: 'Máximo 2 MB.' });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingAvatar(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const onRemoveAvatar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingAvatar(null);
    setPreviewUrl(null);
    setRemoveAvatar(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error('Nome de exibição é obrigatório');
      return;
    }
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      toast.error('Insira um endereço de e-mail válido');
      return;
    }

    setSaving(true);
    try {
      let nextAvatarUrl: string | null = profile.avatar_url ?? null;

      if (pendingAvatar) {
        const ext = pendingAvatar.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, pendingAvatar, {
            cacheControl: '3600',
            upsert: true,
            contentType: pendingAvatar.type,
          });
        if (uploadError) {
          throw new Error(`Falha no upload: ${uploadError.message}`);
        }
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        nextAvatarUrl = publicUrl;
      } else if (removeAvatar) {
        nextAvatarUrl = null;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: trimmedName, avatar_url: nextAvatarUrl })
        .eq('user_id', user.id);
      if (updateError) {
        throw new Error(`Falha ao salvar: ${updateError.message}`);
      }

      let emailSent = false;
      if (trimmedEmail.toLowerCase() !== profile.email.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (emailError) {
          toast.success('Perfil salvo');
          toast.error(`Falha na alteração de e-mail: ${emailError.message}`);
          setSaving(false);
          await refreshProfile();
          return;
        }
        emailSent = true;
      }

      setEmailChangePending(emailSent);
      setPendingAvatar(null);
      setPreviewUrl(null);
      setRemoveAvatar(false);
      await refreshProfile();

      toast.success(
        emailSent
          ? 'Perfil salvo — verifique seu e-mail para confirmar a alteração de endereço'
          : 'Perfil salvo',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    !!profile &&
    (fullName.trim() !== (profile.full_name ?? '') ||
      email.trim().toLowerCase() !== (profile.email ?? '').toLowerCase() ||
      pendingAvatar !== null ||
      removeAvatar);

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <section className="max-w-2xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Seu perfil"
        description="Como você aparece em toda a plataforma. Seu avatar e nome aparecem no cabeçalho, barra lateral e em todos os lugares onde sua equipe te vê."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <div style={{ backgroundColor: "rgba(159,176,201,0.04)", border: "1px solid rgba(159,176,201,0.16)", borderRadius: "12px", padding: "20px" }} className="space-y-6">
          {/* Avatar row */}
          <div className="flex flex-wrap items-center gap-5">
            <Avatar size="lg" className="size-16">
              {currentAvatar ? (
                <AvatarImage src={currentAvatar} alt={fullName || 'Avatar'} />
              ) : null}
              <AvatarFallback style={{ backgroundColor: "rgba(43,111,219,0.14)", color: "var(--ei-cobalt)", fontSize: "18px", fontWeight: 600 }}>
                {initial}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={onPickFile}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { if (!saving) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
              >
                <Upload className="size-4" />
                {currentAvatar ? 'Alterar foto' : 'Enviar foto'}
              </button>
              {currentAvatar && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
                >
                  <Trash2 className="size-4" />
                  Remover
                </button>
              )}
              <p className="w-full text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                PNG, JPG, WebP ou GIF. Máximo 2 MB.
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-full-name" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nome de exibição
            </Label>
            <Input
              id="profile-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
              maxLength={120}
              disabled={saving}
              required
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="profile-email" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              E-mail
            </Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              required
              style={inputStyle}
            />
            {emailChangePending && (
              <p className="flex items-start gap-2 rounded-md px-3 py-2 text-xs" style={{ border: "1px solid rgba(251,191,36,0.30)", backgroundColor: "rgba(251,191,36,0.10)", color: "#fcd34d" }}>
                <Mail className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Verifique a caixa de entrada de <strong>{profile?.email}</strong> e{' '}
                  <strong>{email}</strong> — ambos precisam confirmar para a alteração ter efeito.
                </span>
              </p>
            )}
          </div>

          {/* Read-only block */}
          <div className="rounded-lg p-4" style={{ border: "1px solid rgba(159,176,201,0.16)", backgroundColor: "rgba(159,176,201,0.06)" }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Detalhes da conta
            </p>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Função</dt>
                <dd className="mt-0.5" style={{ color: "var(--ei-offwhite)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {profile?.role ?? 'user'}
                </dd>
              </div>
              <div>
                <dt style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Entrou em</dt>
                <dd className="mt-0.5" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{joined}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>ID do usuário</dt>
                <dd className="mt-0.5 break-all text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {user?.id ?? '—'}
                </dd>
              </div>
            </dl>
          </div>

          {!profile && (
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <CircleAlert className="size-4" />
              Carregando seu perfil…
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !dirty || !profile}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={(e) => { if (!saving && dirty && profile) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando…
              </>
            ) : (
              'Salvar alterações'
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
