import { MOCK_USER, MOCK_PROFILE, MOCK_ACCOUNT, MOCK_CONTACTS, MOCK_TAGS, MOCK_TEMPLATES, MOCK_BROADCASTS, MOCK_AUTOMATIONS, MOCK_MEMBERS, MOCK_AGENTS } from './mock-data'

const TABLE_DATA: Record<string, unknown[]> = {
  profiles: [MOCK_PROFILE],
  accounts: [MOCK_ACCOUNT],
  contacts: MOCK_CONTACTS,
  tags: MOCK_TAGS,
  conversations: [],
  messages: [],
  message_templates: MOCK_TEMPLATES,
  broadcasts: MOCK_BROADCASTS,
  automations: MOCK_AUTOMATIONS,
  agents: MOCK_AGENTS,
  account_members: MOCK_MEMBERS,
  contact_tags: [],
  custom_fields: [],
  deals: [],
  pipelines: [],
  pipeline_stages: [],
  flows: [],
}

function buildQuery(table: string) {
  let _data = [...(TABLE_DATA[table] ?? [])]
  let _single = false
  let _maybeSingle = false
  let _count = false
  let _head = false

  const resolve = () => {
    const count = _data.length
    if (_head) return { data: null, count, error: null }
    if (_single) return { data: _data[0] ?? null, error: null }
    if (_maybeSingle) return { data: _data[0] ?? null, error: null }
    if (_count) return { data: _data, count, error: null }
    return { data: _data, error: null }
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
    limit() { return chain },
    single() { _single = true; return resolve() },
    maybeSingle() { _maybeSingle = true; return resolve() },
    insert(rows: unknown) {
      const arr = Array.isArray(rows) ? rows : [rows]
      return { data: arr[0], error: null }
    },
    update() { return { eq: () => ({ data: null, error: null }), match: () => ({ data: null, error: null }) } },
    delete() { return { eq: () => ({ data: null, error: null }), match: () => ({ data: null, error: null }) } },
    upsert(rows: unknown) {
      const arr = Array.isArray(rows) ? rows : [rows]
      return { data: arr[0], error: null }
    },
  }
  Object.assign(chain, methods)
  Object.defineProperty(chain, 'then', {
    get() { return (fn: (v: unknown) => unknown) => Promise.resolve(fn(resolve())) },
  })
  return chain
}

export async function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
      getSession: async () => ({ data: { session: { user: MOCK_USER } }, error: null }),
    },
    from: (table: string) => buildQuery(table),
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'mock' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ data: [], error: null }),
        list: async () => ({ data: [], error: null }),
      }),
    },
    channel: (_name: string) => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
    removeChannel: () => {},
  }
}
