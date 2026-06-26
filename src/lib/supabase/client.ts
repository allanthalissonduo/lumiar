'use client'

import {
  MOCK_CONTACTS, MOCK_TAGS, MOCK_CONVERSATIONS, MOCK_MESSAGES,
  MOCK_TEMPLATES, MOCK_BROADCASTS, MOCK_AUTOMATIONS, MOCK_MEMBERS,
  MOCK_PROFILE, MOCK_ACCOUNT, MOCK_USER,
} from './mock-data'

const TABLE_DATA: Record<string, unknown[]> = {
  profiles: [MOCK_PROFILE],
  accounts: [MOCK_ACCOUNT],
  contacts: MOCK_CONTACTS,
  tags: MOCK_TAGS,
  conversations: MOCK_CONVERSATIONS,
  messages: MOCK_MESSAGES,
  message_templates: MOCK_TEMPLATES,
  broadcasts: MOCK_BROADCASTS,
  automations: MOCK_AUTOMATIONS,
  account_members: MOCK_MEMBERS,
  contact_tags: [],
  contact_custom_values: [],
  custom_fields: [],
  deals: [],
  pipelines: [],
  pipeline_stages: [],
  flows: [],
  flow_nodes: [],
  flow_edges: [],
  sessions: [],
  presence: [],
  automation_steps: [],
  broadcast_recipients: [],
  account_invitations: [],
  deal_activities: [],
}

function buildQuery(table: string) {
  let _data = [...(TABLE_DATA[table] ?? [])]
  let _single = false
  let _maybeSingle = false
  let _count = false
  let _head = false
  let _limit: number | null = null

  const resolve = () => {
    let result = _data
    if (_limit !== null) result = result.slice(0, _limit)
    const count = result.length
    if (_head) return { data: null, count, error: null }
    if (_single) return { data: result[0] ?? null, error: result[0] ? null : { message: 'No rows' } }
    if (_maybeSingle) return { data: result[0] ?? null, error: null }
    if (_count) return { data: result, count, error: null }
    return { data: result, error: null }
  }

  const chain: Record<string, unknown> = {}

  const methods: Record<string, (...args: unknown[]) => unknown> = {
    select(...args: unknown[]) {
      const opts = args[1] as Record<string, unknown> | undefined
      if (opts?.count) _count = true
      if (opts?.head) _head = true
      return chain
    },
    eq(col: unknown, val: unknown) {
      _data = _data.filter((r) => (r as Record<string, unknown>)[col as string] === val)
      return chain
    },
    neq(col: unknown, val: unknown) {
      _data = _data.filter((r) => (r as Record<string, unknown>)[col as string] !== val)
      return chain
    },
    in(col: unknown, vals: unknown) {
      _data = _data.filter((r) => (vals as unknown[]).includes((r as Record<string, unknown>)[col as string]))
      return chain
    },
    order() { return chain },
    limit(n: unknown) { _limit = n as number; return chain },
    range() { return chain },
    gte() { return chain },
    lte() { return chain },
    gt() { return chain },
    lt() { return chain },
    like() { return chain },
    ilike() { return chain },
    contains() { return chain },
    not() { return chain },
    filter() { return chain },
    match() { return chain },
    or() { return chain },
    is() { return chain },
    textSearch() { return chain },
    single() { _single = true; return resolve() },
    maybeSingle() { _maybeSingle = true; return resolve() },
    insert(rows: unknown) {
      const arr = Array.isArray(rows) ? rows : [rows]
      arr.forEach((r) => TABLE_DATA[table]?.push(r))
      return { data: arr[0], error: null }
    },
    update(patch: unknown) {
      return {
        eq(_col: unknown, _val: unknown) {
          _data.forEach((r) => Object.assign(r as object, patch as object))
          return { data: _data[0] ?? null, error: null }
        },
        match() { return { data: null, error: null } },
      }
    },
    delete() {
      return {
        eq(_col: unknown, _val: unknown) { return { data: null, error: null } },
        match() { return { data: null, error: null } },
      }
    },
    upsert(rows: unknown) {
      const arr = Array.isArray(rows) ? rows : [rows]
      arr.forEach((r) => {
        const existing = TABLE_DATA[table]?.find(
          (e) => (e as Record<string, unknown>).id === (r as Record<string, unknown>).id
        )
        if (existing) Object.assign(existing as object, r as object)
        else TABLE_DATA[table]?.push(r)
      })
      return { data: arr[0], error: null }
    },
  }

  Object.assign(chain, methods)
  Object.defineProperty(chain, 'then', {
    get() {
      return (fn: (v: unknown) => unknown) => Promise.resolve(fn(resolve()))
    },
  })

  return chain
}

const MOCK_AUTH = {
  getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
  getSession: async () => ({
    data: {
      session: {
        user: MOCK_USER,
        access_token: 'mock',
        refresh_token: 'mock',
        expires_in: 3600,
        token_type: 'bearer',
      },
    },
    error: null,
  }),
  onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
    const session = { user: MOCK_USER, access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer' }
    setTimeout(() => cb('SIGNED_IN', session), 0)
    return { data: { subscription: { unsubscribe: () => {} } } }
  },
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({ data: { user: MOCK_USER, session: null }, error: null }),
  updateUser: async () => ({ data: { user: MOCK_USER }, error: null }),
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
}

function createMockClient() {
  return {
    auth: MOCK_AUTH,
    from: (table: string) => buildQuery(table),
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'mock/path' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ data: [], error: null }),
        list: async () => ({ data: [], error: null }),
      }),
    },
    channel: (_name: string) => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    }),
    removeChannel: () => {},
    rpc: async (_fn: string, _args?: unknown) => ({ data: null, error: null }),
  }
}

let browserClient: ReturnType<typeof createMockClient> | undefined

export function createClient() {
  if (!browserClient) browserClient = createMockClient()
  return browserClient
}
