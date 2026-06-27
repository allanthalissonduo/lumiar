import { NextRequest } from "next/server";
import { resolveOpenRouterKey } from "@/app/api/account/ai-config/route";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  model: string;
  system_prompt: string;
  messages: ChatMessage[];
  /** OpenRouter site reference (optional but recommended for ranking). */
  site_url?: string;
  site_name?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = await resolveOpenRouterKey();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Chave OpenRouter não configurada. Acesse Configurações → IA para adicionar." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { model, system_prompt, messages, site_url, site_name } = body;
  if (!model || !messages?.length) {
    return new Response(JSON.stringify({ error: "model and messages are required" }), { status: 400 });
  }

  const openRouterMessages = [
    { role: "system", content: system_prompt || "" },
    ...messages,
  ];

  const upstream = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": site_url ?? "https://lumiar.app",
      "X-Title": site_name ?? "Lumiar CRM",
    },
    body: JSON.stringify({
      model,
      messages: openRouterMessages,
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(JSON.stringify({ error: err }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Proxy the SSE stream directly to the client.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
