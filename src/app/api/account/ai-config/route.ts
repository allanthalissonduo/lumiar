/**
 * GET  /api/account/ai-config  → returns masked key + default model
 * PUT  /api/account/ai-config  → saves key (encrypted) + model
 * DELETE /api/account/ai-config → removes the key
 *
 * In production the key is stored AES-256-GCM encrypted in the
 * `accounts` table (column `openrouter_key_enc`) — same pattern as
 * the WhatsApp token. In mock/dev mode it lives in a module-level
 * variable so the UI can round-trip without a real DB.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---- In-memory store for mock/dev mode ----
let mockKeyStore: { key: string; model: string } | null = null;

// ---- Encryption helpers (same as whatsapp/config) ----
const ENC_KEY_HEX = process.env.ENCRYPTION_KEY ?? "";

async function getCryptoKey(): Promise<CryptoKey | null> {
  if (ENC_KEY_HEX.length !== 64) return null;
  const raw = Uint8Array.from(
    ENC_KEY_HEX.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptKey(plaintext: string): Promise<string> {
  const ck = await getCryptoKey();
  if (!ck) return `plain:${plaintext}`;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, ck, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(iv.length + enc.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(enc), iv.length);
  return Buffer.from(combined).toString("base64");
}

async function decryptKey(ciphertext: string): Promise<string | null> {
  if (ciphertext.startsWith("plain:")) return ciphertext.slice(6);
  const ck = await getCryptoKey();
  if (!ck) return null;
  try {
    const combined = Uint8Array.from(Buffer.from(ciphertext, "base64"));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, ck, data);
    return new TextDecoder().decode(dec);
  } catch {
    return null;
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 7) + "••••••••••••••••" + key.slice(-4);
}

// ---- Route handlers ----

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: account } = await db.from("accounts").select("openrouter_key_enc, openrouter_model").maybeSingle();

  let keyEnc: string | null = account?.openrouter_key_enc ?? null;
  let model: string = account?.openrouter_model ?? "anthropic/claude-haiku-4-5";

  // Fallback to in-memory mock store
  if (!keyEnc && mockKeyStore) {
    keyEnc = mockKeyStore.key;
    model = mockKeyStore.model;
  }

  // Fallback to env var
  const envKey = process.env.OPENROUTER_API_KEY;
  if (!keyEnc && envKey) {
    return NextResponse.json({
      has_key: true,
      masked_key: maskKey(envKey),
      source: "env",
      model,
    });
  }

  if (!keyEnc) {
    return NextResponse.json({ has_key: false, masked_key: null, source: null, model });
  }

  const plain = await decryptKey(keyEnc);
  return NextResponse.json({
    has_key: !!plain,
    masked_key: plain ? maskKey(plain) : null,
    source: "db",
    model,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { key, model } = body as { key?: string; model?: string };

  if (key !== undefined && key !== "") {
    // Validate key looks like an OpenRouter key
    if (!key.startsWith("sk-or-")) {
      return NextResponse.json({ error: "Chave inválida — deve começar com sk-or-" }, { status: 400 });
    }
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: account } = await db.from("accounts").select("id").maybeSingle();

  const enc = key ? await encryptKey(key) : undefined;
  const patch: Record<string, string> = {};
  if (enc !== undefined) patch.openrouter_key_enc = enc;
  if (model) patch.openrouter_model = model;

  if (account?.id) {
    await db.from("accounts").update(patch).eq("id", account.id);
  }

  // Always persist to mock store so the chat routes can pick it up
  if (key || model) {
    mockKeyStore = {
      key: enc ?? mockKeyStore?.key ?? "",
      model: model ?? mockKeyStore?.model ?? "anthropic/claude-haiku-4-5",
    };
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest) {
  mockKeyStore = null;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: account } = await db.from("accounts").select("id").maybeSingle();
  if (account?.id) {
    await db.from("accounts").update({ openrouter_key_enc: null }).eq("id", account.id);
  }

  return NextResponse.json({ ok: true });
}

/** Called by /api/ai/chat and /api/ai/suggest to resolve the effective key. */
export async function resolveOpenRouterKey(): Promise<string | null> {
  // 1. In-memory mock store (set via PUT)
  if (mockKeyStore?.key) {
    const plain = await decryptKey(mockKeyStore.key);
    if (plain) return plain;
  }

  // 2. Env var (server-only)
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;

  // 3. DB (production)
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data } = await db.from("accounts").select("openrouter_key_enc").maybeSingle();
    if (data?.openrouter_key_enc) return decryptKey(data.openrouter_key_enc);
  } catch {
    // ignore
  }

  return null;
}
