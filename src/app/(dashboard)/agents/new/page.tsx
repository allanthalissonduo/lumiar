"use client";

import AgentEditorPage from "@/app/(dashboard)/agents/[id]/page";

// `/agents/new` renders the 5-panel editor in creation mode.
// The editor reads params.id from useParams(); when accessed via this
// static route, useParams() returns {} so we pass "new" as a prop.
export default function NewAgentPage() {
  return <AgentEditorPage />;
}
