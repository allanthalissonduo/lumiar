'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsPanelHead } from './settings-panel-head';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { WhatsAppConfig as WhatsAppConfigType } from '@/types';

const MASKED_TOKEN = '••••••••••••••••';

type ConnectionStatus = 'connected' | 'disconnected' | 'unknown';
type ResetReason = 'token_corrupted' | 'meta_api_error' | null;

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.08)",
  border: "1px solid rgba(159,176,201,0.22)",
  color: "var(--ei-offwhite)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "rgba(159,176,201,0.04)",
  border: "1px solid rgba(159,176,201,0.16)",
  borderRadius: "12px",
  padding: "20px",
};

export function WhatsAppConfig() {
  const supabase = createClient();
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfigType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [resetReason, setResetReason] = useState<ResetReason>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [pin, setPin] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);

  const isRegistered = Boolean(config?.registered_at);
  const lastRegistrationError = config?.last_registration_error ?? null;

  const [verifyingRegistration, setVerifyingRegistration] = useState(false);
  type RegistrationProbe = {
    live: boolean;
    checks: Record<string, boolean | null>;
    errors?: string[];
    last_registration_error?: string | null;
    registered_at?: string | null;
    subscribed_apps_at?: string | null;
  };
  const [registrationProbe, setRegistrationProbe] =
    useState<RegistrationProbe | null>(null);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : '';

  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', acctId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load config row:', error);
      }

      if (data) {
        setConfig(data);
        setPhoneNumberId(data.phone_number_id || '');
        setWabaId(data.waba_id || '');
        setAccessToken(MASKED_TOKEN);
        setVerifyToken('');
        setPin('');
        setTokenEdited(false);
      } else {
        setConfig(null);
        setPhoneNumberId('');
        setWabaId('');
        setAccessToken('');
        setVerifyToken('');
        setPin('');
        setTokenEdited(false);
      }
      setRegistrationProbe(null);

      if (data) {
        try {
          const res = await fetch('/api/whatsapp/config', { method: 'GET' });
          const payload = await res.json();

          if (payload.connected) {
            setConnectionStatus('connected');
            setResetReason(null);
            setStatusMessage('');
          } else {
            setConnectionStatus('disconnected');
            setResetReason(payload.needs_reset ? 'token_corrupted' : payload.reason === 'meta_api_error' ? 'meta_api_error' : null);
            setStatusMessage(payload.message || '');
          }
        } catch (err) {
          console.error('Health check failed:', err);
          setConnectionStatus('disconnected');
        }
      } else {
        setConnectionStatus('disconnected');
        setResetReason(null);
        setStatusMessage('');
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
      toast.error('Falha ao carregar configuração do WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      setLoading(false);
      return;
    }
    fetchConfig(accountId);
  }, [authLoading, profileLoading, user, accountId, fetchConfig]);

  async function handleSave() {
    if (!phoneNumberId.trim()) {
      toast.error('Phone Number ID é obrigatório');
      return;
    }
    if (!config && (!accessToken.trim() || !tokenEdited)) {
      toast.error('Access Token é obrigatório na configuração inicial');
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim() || null,
        verify_token: verifyToken.trim() || null,
        pin: pin.trim() || null,
      };

      if (tokenEdited && accessToken !== MASKED_TOKEN && accessToken.trim()) {
        payload.access_token = accessToken.trim();
      } else if (config) {
        toast.error('Por favor, insira o Access Token novamente para salvar as alterações');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Falha ao salvar configuração');
        setSaving(false);
        return;
      }

      if (data.registered === false && data.registration_error) {
        toast.error(
          `Salvo, mas a Meta não pôde registrar o número: ${data.registration_error}`,
          { duration: 12000 },
        );
      } else if (data.registration_skipped) {
        toast.success(
          'Credenciais salvas e verificadas. O registro de entrada foi ignorado (sem PIN) — veja o status de Registro abaixo.',
          { duration: 10000 },
        );
        setPin('');
      } else {
        toast.success(
          data.phone_info?.verified_name
            ? `Ativo — ${data.phone_info.verified_name} pode receber eventos.`
            : 'WhatsApp conectado. Os eventos começarão a chegar em breve.',
        );
        setPin('');
      }

      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Falha ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    try {
      setTesting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus('connected');
        setResetReason(null);
        setStatusMessage('');
        toast.success(
          payload.phone_info?.verified_name
            ? `Conectado a ${payload.phone_info.verified_name}`
            : 'Conexão com a API bem-sucedida'
        );
      } else {
        setConnectionStatus('disconnected');
        setResetReason(payload.needs_reset ? 'token_corrupted' : payload.reason === 'meta_api_error' ? 'meta_api_error' : null);
        setStatusMessage(payload.message || '');
        toast.error(payload.message || 'Falha na conexão com a API');
      }
    } catch (err) {
      console.error('Test connection error:', err);
      setConnectionStatus('disconnected');
      toast.error('Teste de conexão falhou. Verifique a rede e tente novamente.');
    } finally {
      setTesting(false);
    }
  }

  async function handleVerifyRegistration() {
    setVerifyingRegistration(true);
    setRegistrationProbe(null);
    try {
      const res = await fetch('/api/whatsapp/config/verify-registration', {
        method: 'GET',
      });
      const data = (await res.json()) as RegistrationProbe;
      setRegistrationProbe(data);
      if (data.live) {
        toast.success('Número totalmente configurado — a Meta está entregando eventos.');
      } else {
        toast.error(
          'Número não está totalmente registrado. Veja os diagnósticos abaixo.',
          { duration: 8000 },
        );
      }
      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error('verify-registration failed:', err);
      toast.error('Não foi possível alcançar o endpoint de verificação.');
    } finally {
      setVerifyingRegistration(false);
    }
  }

  async function handleReset() {
    if (!confirm('Isso apagará a configuração atual do WhatsApp para que você possa reinserí-la. Continuar?')) {
      return;
    }

    try {
      setResetting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Falha ao redefinir configuração');
        return;
      }

      toast.success('Configuração apagada. Você pode inserir suas credenciais novamente.');
      setConfig(null);
      setPhoneNumberId('');
      setWabaId('');
      setAccessToken('');
      setVerifyToken('');
      setTokenEdited(false);
      setConnectionStatus('disconnected');
      setResetReason(null);
      setStatusMessage('');
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Falha ao redefinir configuração');
    } finally {
      setResetting(false);
    }
  }

  function handleCopyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL do webhook copiada');
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="Conexão WhatsApp"
          description="Conecte sua API WhatsApp Business da Meta. Credenciais, webhook e instruções de configuração ficam aqui."
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin" style={{ color: "var(--ei-cobalt)" }} />
        </div>
      </section>
    );
  }

  const showResetBanner = resetReason === 'token_corrupted';

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Conexão WhatsApp"
        description="Conecte sua API WhatsApp Business da Meta. Credenciais, webhook e instruções de configuração ficam aqui."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main config form */}
        <div className="space-y-6">
          {/* Corrupted-token reset banner */}
          {showResetBanner && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.40)" }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
                <div className="flex-1">
                  <p className="font-medium mb-1" style={{ color: "#fde68a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Token armazenado não pode ser descriptografado
                  </p>
                  <p className="text-sm" style={{ color: "rgba(253,230,138,0.80)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {statusMessage}
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                    style={{ backgroundColor: "#d97706", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#b45309"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#d97706"; }}
                  >
                    {resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                    {resetting ? 'Redefinindo...' : 'Redefinir Configuração'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Connection Status */}
          <div className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              {connectionStatus === 'connected' ? (
                <CheckCircle2 className="size-4" style={{ color: "var(--ei-iris)" }} />
              ) : (
                <XCircle className="size-4" style={{ color: "#f87171" }} />
              )}
              <p className="font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {connectionStatus === 'connected' ? 'Credenciais válidas' : 'Não conectado'}
              </p>
            </div>
            <p className="text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {connectionStatus === 'connected'
                ? 'Seu token de acesso autentica com a Meta. Veja o status de Registro abaixo para saber se os webhooks estão configurados.'
                : statusMessage ||
                  'Configure suas credenciais da API Meta abaixo para conectar sua conta WhatsApp Business.'}
            </p>
          </div>

          {/* Registration Status */}
          {config && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: isRegistered ? "rgba(16,185,129,0.08)" : "rgba(217,119,6,0.08)",
                border: isRegistered ? "1px solid rgba(16,185,129,0.30)" : "1px solid rgba(217,119,6,0.30)",
              }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  {isRegistered ? (
                    <CheckCircle2 className="size-4" style={{ color: "#34d399" }} />
                  ) : (
                    <AlertTriangle className="size-4" style={{ color: "#fbbf24" }} />
                  )}
                  <p className="font-medium" style={{ color: isRegistered ? "#a7f3d0" : "#fde68a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {isRegistered
                      ? 'Registrado — a Meta entregará eventos ao Lumiar'
                      : 'Não registrado — a Meta não entregará eventos'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyRegistration}
                  disabled={verifyingRegistration}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                  style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                >
                  {verifyingRegistration ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Zap className="size-3.5" />
                  )}
                  Verificar com a Meta
                </button>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isRegistered ? (
                  <>
                    Inscrito desde{' '}
                    {config.registered_at
                      ? new Date(config.registered_at).toLocaleString('pt-BR')
                      : 'desconhecido'}
                    . Clique em <strong>Verificar com a Meta</strong> se os eventos pararem.
                  </>
                ) : lastRegistrationError ? (
                  <>
                    Última tentativa falhou com:{' '}
                    <span style={{ color: "#fca5a5" }}>
                      &quot;{lastRegistrationError}&quot;
                    </span>
                    . Insira (ou corrija) o PIN de 2 etapas abaixo e clique em Salvar para tentar novamente.
                  </>
                ) : (
                  <>
                    Este número foi salvo antes do rastreamento de registro existir, ou o registro foi ignorado. Insira o PIN de 2 etapas abaixo e clique em Salvar para inscrevê-lo.
                  </>
                )}
              </p>

              {registrationProbe && (
                <div className="mt-3 rounded-lg px-3 py-2 space-y-1.5 text-[11px]" style={{ border: "1px solid rgba(159,176,201,0.16)", backgroundColor: "rgba(159,176,201,0.06)" }}>
                  <p className="font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Diagnóstico — última execução:{' '}
                    <span style={{ color: registrationProbe.live ? "#34d399" : "#fbbf24" }}>
                      {registrationProbe.live ? 'ativo' : 'inativo'}
                    </span>
                  </p>
                  <ul className="space-y-0.5" style={{ color: "var(--ei-text-soft)" }}>
                    {Object.entries(registrationProbe.checks).map(([k, v]) => (
                      <li key={k} className="flex items-center gap-1.5">
                        {v === true ? (
                          <CheckCircle2 className="size-3 shrink-0" style={{ color: "#34d399" }} />
                        ) : v === false ? (
                          <XCircle className="size-3 shrink-0" style={{ color: "#f87171" }} />
                        ) : (
                          <span className="size-3 rounded-full shrink-0" style={{ border: "1px solid rgba(159,176,201,0.30)" }} />
                        )}
                        <code style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{k}</code>
                      </li>
                    ))}
                  </ul>
                  {(registrationProbe.errors ?? []).length > 0 && (
                    <ul className="pt-1 space-y-0.5" style={{ color: "#fca5a5" }}>
                      {registrationProbe.errors?.map((e, i) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* API Credentials */}
          <div style={cardStyle}>
            <p className="font-semibold mb-1" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Credenciais da API</p>
            <p className="text-sm mb-4" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Insira suas credenciais da API WhatsApp Business da Meta.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Phone Number ID</Label>
                <Input
                  placeholder="ex. 100234567890123"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>WhatsApp Business Account ID</Label>
                <Input
                  placeholder="ex. 100234567890456"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Token de Acesso Permanente</Label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Insira seu token de acesso"
                    value={accessToken}
                    onChange={(e) => {
                      setAccessToken(e.target.value);
                      setTokenEdited(true);
                    }}
                    onFocus={() => {
                      if (accessToken === MASKED_TOKEN) {
                        setAccessToken('');
                        setTokenEdited(true);
                      }
                    }}
                    style={{ ...inputStyle, paddingRight: "2.5rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--ei-text-soft)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
                  >
                    {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {config && !tokenEdited && (
                  <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Token oculto por segurança. Insira-o novamente para atualizar a configuração.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Token de Verificação do Webhook</Label>
                <Input
                  placeholder="Crie um token de verificação personalizado"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  style={inputStyle}
                />
                <p className="text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Uma string personalizada que você cria. Deve corresponder ao token definido nas configurações do webhook da Meta.
                </p>
              </div>

              <div className="space-y-2">
                <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  PIN de verificação em duas etapas
                  <span className="ml-1" style={{ color: "var(--ei-text-soft)" }}>(opcional)</span>
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="PIN de 6 dígitos do Meta WhatsApp Manager"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  style={{ ...inputStyle, letterSpacing: "0.2em" }}
                />
                <p className="text-xs leading-relaxed" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Necessário apenas para numeros de <strong style={{ color: "var(--ei-offwhite)" }}>produção</strong>.
                  Configure em Meta Business Manager → Contas WhatsApp → Números → Verificação em duas etapas.
                  Números de teste da Meta não têm PIN — deixe em branco para eles.
                </p>
              </div>
            </div>
          </div>

          {/* Webhook URL */}
          <div style={cardStyle}>
            <p className="font-semibold mb-1" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Configuração do Webhook</p>
            <p className="text-sm mb-4" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Use esta URL como callback do webhook no Meta App Dashboard.
            </p>
            <div className="space-y-2">
              <Label style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>URL de Callback do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="shrink-0 flex items-center justify-center rounded-lg w-10 h-10 transition-colors"
                  style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-royal)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--ei-cobalt)"; }}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !config}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "transparent", color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={(e) => { if (!testing && config) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
            >
              {testing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Zap className="size-4" />
                  Testar Conexão
                </>
              )}
            </button>
            {config && (
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ border: "1px solid rgba(248,113,113,0.30)", backgroundColor: "transparent", color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { if (!resetting) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(248,113,113,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5"; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
              >
                {resetting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    Redefinir Configuração
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Setup Instructions Sidebar */}
        <div>
          <div style={cardStyle}>
            <p className="font-semibold text-base mb-1" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Instruções de Configuração</p>
            <p className="text-sm mb-4" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Siga estes passos para conectar sua API WhatsApp Business.
            </p>
            <Accordion>
              <AccordionItem style={{ borderBottom: "1px solid rgba(159,176,201,0.16)" }}>
                <AccordionTrigger style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff" }}>1</span>
                    Criar um App na Meta
                  </span>
                </AccordionTrigger>
                <AccordionContent style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Acesse <span style={{ color: "var(--ei-cobalt)" }}>developers.facebook.com</span></li>
                    <li>Clique em &quot;Meus Apps&quot; e depois em &quot;Criar App&quot;</li>
                    <li>Selecione &quot;Business&quot; como tipo de app</li>
                    <li>Preencha os detalhes e crie</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem style={{ borderBottom: "1px solid rgba(159,176,201,0.16)" }}>
                <AccordionTrigger style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff" }}>2</span>
                    Adicionar Produto WhatsApp
                  </span>
                </AccordionTrigger>
                <AccordionContent style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>No painel do app, clique em &quot;Adicionar Produto&quot;</li>
                    <li>Encontre &quot;WhatsApp&quot; e clique em &quot;Configurar&quot;</li>
                    <li>Siga o assistente para vincular sua empresa</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem style={{ borderBottom: "1px solid rgba(159,176,201,0.16)" }}>
                <AccordionTrigger style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff" }}>3</span>
                    Obter Credenciais da API
                  </span>
                </AccordionTrigger>
                <AccordionContent style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Acesse WhatsApp &gt; Configuração da API</li>
                    <li>Copie seu <strong style={{ color: "var(--ei-offwhite)" }}>Phone Number ID</strong></li>
                    <li>Copie seu <strong style={{ color: "var(--ei-offwhite)" }}>WhatsApp Business Account ID</strong></li>
                    <li>Gere um <strong style={{ color: "var(--ei-offwhite)" }}>Token de Acesso Permanente</strong> em Configurações de Negócios &gt; Usuários do Sistema</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem style={{ borderBottom: "none" }}>
                <AccordionTrigger style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff" }}>4</span>
                    Configurar Webhooks
                  </span>
                </AccordionTrigger>
                <AccordionContent style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Acesse WhatsApp &gt; Configuração</li>
                    <li>Clique em &quot;Editar&quot; na seção Webhook</li>
                    <li>Cole a <strong style={{ color: "var(--ei-offwhite)" }}>URL de Callback do Webhook</strong> acima</li>
                    <li>Insira o mesmo <strong style={{ color: "var(--ei-offwhite)" }}>Token de Verificação</strong> definido aqui</li>
                    <li>Inscreva-se no campo de webhook &quot;messages&quot;</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(159,176,201,0.16)" }}>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ei-iris)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ei-cobalt)"; }}
              >
                <ExternalLink className="size-3.5" />
                Documentação da API WhatsApp da Meta
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
