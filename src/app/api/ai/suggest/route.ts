import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Agent } from "@/types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export interface SuggestRequestBody {
  /** ID of the agent to use. If omitted, uses the first active agent in the account. */
  agent_id?: string;
  /** Recent messages in the conversation, in chronological order. */
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  /** Contact name for personalization. */
  contact_name?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  let body: SuggestRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agent_id, messages, contact_name } = body;
  if (!messages?.length) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Fetch the agent config. The server client is untyped (mock) so we cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const result = agent_id
    ? await db.from("agents").select("*").eq("id", agent_id).single()
    : await db.from("agents").select("*").eq("is_active", true).limit(1).maybeSingle();

  if (result.error || !result.data) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const agent = result.data as Agent;

  // Build system prompt enriched with contact context.
  const systemPrompt = [
    agent.system_prompt,
    contact_name
      ? `\nO cliente desta conversa se chama ${contact_name}. Use o nome de forma natural quando apropriado.`
      : "",
    "\nResponda APENAS com o texto da mensagem de resposta — sem saudações extras, sem emojis, sem aspas. Seja conciso.",
  ]
    .filter(Boolean)
    .join("");

  const upstream = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://lumiar.app",
      "X-Title": "Lumiar CRM",
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: false,
      max_tokens: 512,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json({ error: err }, { status: upstream.status });
  }

  const completion = await upstream.json();
  const suggestion: string =
    completion?.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ suggestion });
}
