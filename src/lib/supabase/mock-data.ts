// Mock data for UI preview mode

export const MOCK_USER = {
  id: 'mock-user-id',
  email: 'allan@duo.studio',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { full_name: 'Allan Thalisson' },
  aud: 'authenticated',
  role: 'authenticated',
}

export const MOCK_PROFILE = {
  id: 'mock-profile-id',
  user_id: 'mock-user-id',
  full_name: 'Allan Thalisson',
  email: 'allan@duo.studio',
  avatar_url: null,
  role: 'owner',
  beta_features: [],
  account_id: 'mock-account-id',
  account_role: 'owner' as const,
  created_at: new Date().toISOString(),
}

export const MOCK_ACCOUNT = {
  id: 'mock-account-id',
  name: 'Duo Studio',
  owner_user_id: 'mock-user-id',
  default_currency: 'BRL',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const MOCK_CONTACTS = [
  { id: 'c1', user_id: 'mock-user-id', account_id: 'mock-account-id', name: 'Maria Silva', phone: '+5511999990001', email: 'maria@exemplo.com', company: 'Loja Exemplo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c2', user_id: 'mock-user-id', account_id: 'mock-account-id', name: 'João Santos', phone: '+5511999990002', email: 'joao@empresa.com', company: 'Empresa SA', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c3', user_id: 'mock-user-id', account_id: 'mock-account-id', name: 'Ana Oliveira', phone: '+5511999990003', email: 'ana@gmail.com', company: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c4', user_id: 'mock-user-id', account_id: 'mock-account-id', name: 'Carlos Mendes', phone: '+5511999990004', email: 'carlos@vtex.com', company: 'VTEX', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const MOCK_TAGS = [
  { id: 't1', account_id: 'mock-account-id', name: 'VIP', color: '#2B6FDB', created_at: new Date().toISOString() },
  { id: 't2', account_id: 'mock-account-id', name: 'Lead', color: '#1AB8A0', created_at: new Date().toISOString() },
  { id: 't3', account_id: 'mock-account-id', name: 'Suporte', color: '#f59e0b', created_at: new Date().toISOString() },
]

export const MOCK_CONVERSATIONS = [
  {
    id: 'conv1',
    user_id: 'mock-user-id',
    account_id: 'mock-account-id',
    contact_id: 'c1',
    status: 'open' as const,
    assigned_agent_id: null,
    unread_count: 2,
    last_message_text: 'Tenho interesse no plano Premium.',
    last_message_at: new Date(Date.now() - 1800000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: { id: 'c1', user_id: 'mock-user-id', account_id: 'mock-account-id', name: 'Maria Silva', phone: '+5511999990001', email: 'maria@exemplo.com', company: 'Loja Exemplo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  },
  {
    id: 'conv2',
    user_id: 'mock-user-id',
    account_id: 'mock-account-id',
    contact_id: 'c2',
    status: 'pending' as const,
    assigned_agent_id: 'mock-user-id',
    unread_count: 0,
    last_message_text: 'Ok, aguardo o retorno!',
    last_message_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: { id: 'c2', user_id: 'mock-user-id', account_id: 'mock-account-id', name: 'João Santos', phone: '+5511999990002', email: 'joao@empresa.com', company: 'Empresa SA', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  },
  {
    id: 'conv3',
    user_id: 'mock-user-id',
    account_id: 'mock-account-id',
    contact_id: 'c3',
    status: 'open' as const,
    assigned_agent_id: null,
    unread_count: 5,
    last_message_text: 'Quando chega o meu pedido?',
    last_message_at: new Date(Date.now() - 300000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: { id: 'c3', user_id: 'mock-user-id', account_id: 'mock-account-id', name: 'Ana Oliveira', phone: '+5511999990003', email: 'ana@gmail.com', company: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  },
  {
    id: 'conv4',
    user_id: 'mock-user-id',
    account_id: 'mock-account-id',
    contact_id: 'c4',
    status: 'closed' as const,
    assigned_agent_id: null,
    unread_count: 0,
    last_message_text: 'Problema resolvido, obrigado!',
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: { id: 'c4', user_id: 'mock-user-id', account_id: 'mock-account-id', name: 'Carlos Mendes', phone: '+5511999990004', email: 'carlos@vtex.com', company: 'VTEX', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  },
]

export const MOCK_MESSAGES = [
  {
    id: 'm1',
    conversation_id: 'conv1',
    sender_type: 'customer' as const,
    content_type: 'text' as const,
    content_text: 'Olá! Gostaria de saber mais sobre o produto.',
    status: 'delivered' as const,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    reply_to_message_id: null,
    media_url: null,
  },
  {
    id: 'm2',
    conversation_id: 'conv1',
    sender_type: 'agent' as const,
    content_type: 'text' as const,
    content_text: 'Claro! Posso te ajudar. Qual produto te interessa?',
    status: 'read' as const,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    reply_to_message_id: null,
    media_url: null,
  },
  {
    id: 'm3',
    conversation_id: 'conv1',
    sender_type: 'customer' as const,
    content_type: 'text' as const,
    content_text: 'Tenho interesse no plano Premium.',
    status: 'delivered' as const,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    reply_to_message_id: null,
    media_url: null,
  },
  {
    id: 'm4',
    conversation_id: 'conv1',
    sender_type: 'customer' as const,
    content_type: 'text' as const,
    content_text: 'Vocês têm desconto para compras acima de R$500?',
    status: 'delivered' as const,
    created_at: new Date(Date.now() - 900000).toISOString(),
    reply_to_message_id: null,
    media_url: null,
  },
]

export const MOCK_TEMPLATES = [
  { id: 'tpl1', account_id: 'mock-account-id', name: 'boas_vindas', category: 'Marketing', language: 'pt_BR', status: 'APPROVED', body_text: 'Olá {{1}}! Seja bem-vindo(a) à nossa loja. Estamos felizes em ter você conosco! 🎉', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'tpl2', account_id: 'mock-account-id', name: 'confirmacao_pedido', category: 'Utility', language: 'pt_BR', status: 'APPROVED', body_text: 'Olá {{1}}, seu pedido #{{2}} foi confirmado! Prazo de entrega: {{3}} dias úteis.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'tpl3', account_id: 'mock-account-id', name: 'recuperacao_carrinho', category: 'Marketing', language: 'pt_BR', status: 'APPROVED', body_text: 'Ei {{1}}, você esqueceu alguns itens no carrinho! 🛒 Finalize sua compra agora com 10% de desconto.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const MOCK_BROADCASTS = [
  { id: 'b1', account_id: 'mock-account-id', name: 'Promoção de Julho', status: 'sent', template_id: 'tpl1', total_sent: 142, total_delivered: 138, total_read: 97, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'b2', account_id: 'mock-account-id', name: 'Recuperação de Carrinho', status: 'sent', template_id: 'tpl3', total_sent: 58, total_delivered: 55, total_read: 41, created_at: new Date(Date.now() - 172800000).toISOString() },
]

export const MOCK_AUTOMATIONS = [
  { id: 'a1', account_id: 'mock-account-id', name: 'Boas-vindas automático', description: 'Envia mensagem quando novo contato entra', trigger_type: 'contact_created', trigger_config: {}, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'a2', account_id: 'mock-account-id', name: 'Recuperação de carrinho', description: 'Dispara 2h após abandono de carrinho', trigger_type: 'time_based', trigger_config: { delay_hours: 2 }, is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const MOCK_MEMBERS: import('@/types').AccountMember[] = [
  { user_id: 'mock-user-id', full_name: 'Allan Thalisson', email: 'allan@duo.studio', avatar_url: null, role: 'owner', joined_at: new Date().toISOString() },
]
