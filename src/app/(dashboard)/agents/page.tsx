"use client";

import Link from "next/link";
import { Plus, Bot, Zap, ChevronRight } from "lucide-react";

const MOCK_AGENTS = [
  {
    id: "agent-1",
    name: "Assistente de Vendas",
    description: "Qualifica leads, responde dúvidas de produtos e encaminha pedidos.",
    active: true,
    conversations: 142,
  },
  {
    id: "agent-2",
    name: "Suporte Pós-Compra",
    description: "Rastreia pedidos, processa devoluções e escala reclamações.",
    active: false,
    conversations: 87,
  },
];

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Agentes IA
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Configure agentes de IA que respondem automaticamente no WhatsApp.
          </p>
        </div>
        <Link
          href="/agents/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--ei-cobalt)",
            color: "var(--ei-offwhite)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <Plus className="h-4 w-4" />
          Novo agente
        </Link>
      </div>

      {/* Agent list */}
      {MOCK_AGENTS.length === 0 ? (
        <EmptyAgents />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          <NewAgentCard />
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
}: {
  agent: (typeof MOCK_AGENTS)[number];
}) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group flex flex-col rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--ei-surface-card)",
        border: "1px solid rgba(159,176,201,0.18)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(43,111,219,0.40)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(159,176,201,0.18)";
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: "rgba(43,111,219,0.14)", color: "var(--ei-cobalt)" }}
        >
          <Bot className="h-5 w-5" />
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: agent.active ? "rgba(26,184,160,0.12)" : "rgba(159,176,201,0.10)",
            color: agent.active ? "var(--ei-iris)" : "var(--ei-text-soft)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: agent.active ? "var(--ei-iris)" : "var(--ei-text-soft)" }}
          />
          {agent.active ? "Ativo" : "Inativo"}
        </span>
      </div>

      <h3
        className="mt-3 text-sm font-semibold"
        style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {agent.name}
      </h3>
      <p
        className="mt-1 flex-1 text-xs leading-relaxed"
        style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {agent.description}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span
          className="text-xs"
          style={{ color: "var(--ei-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {agent.conversations.toLocaleString()} conversas
        </span>
        <ChevronRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--ei-text-soft)" }}
        />
      </div>
    </Link>
  );
}

function NewAgentCard() {
  return (
    <Link
      href="/agents/new"
      className="flex flex-col items-center justify-center rounded-xl p-5 transition-colors"
      style={{
        border: "1px dashed rgba(159,176,201,0.28)",
        backgroundColor: "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(43,111,219,0.50)";
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(43,111,219,0.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(159,176,201,0.28)";
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: "rgba(43,111,219,0.10)", color: "var(--ei-cobalt)" }}
      >
        <Plus className="h-5 w-5" />
      </div>
      <p
        className="mt-3 text-sm font-medium"
        style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Novo agente
      </p>
    </Link>
  );
}

function EmptyAgents() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-20"
      style={{
        backgroundColor: "var(--ei-surface-card)",
        border: "1px solid rgba(159,176,201,0.18)",
      }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(43,111,219,0.12)" }}
      >
        <Bot className="h-8 w-8" style={{ color: "var(--ei-cobalt)" }} />
      </div>
      <h3
        className="mt-4 text-sm font-semibold"
        style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Nenhum agente criado
      </h3>
      <p
        className="mt-1 text-xs"
        style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Crie seu primeiro agente de IA para automatizar atendimentos.
      </p>
      <Link
        href="/agents/new"
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: "var(--ei-cobalt)", color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <Plus className="h-4 w-4" />
        Criar agente
      </Link>
    </div>
  );
}
