"use client";

import { useMemo } from "react";
import type { MessageReaction } from "@/types";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  currentUserId: string | undefined;
  onToggle: (emoji: string) => void;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  byCurrentUser: boolean;
}

function groupReactions(
  reactions: MessageReaction[],
  currentUserId: string | undefined,
): ReactionGroup[] {
  const map = new Map<string, ReactionGroup>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    const isMine =
      r.actor_type === "agent" &&
      !!currentUserId &&
      r.actor_id === currentUserId;
    if (existing) {
      existing.count += 1;
      existing.byCurrentUser = existing.byCurrentUser || isMine;
    } else {
      map.set(r.emoji, { emoji: r.emoji, count: 1, byCurrentUser: isMine });
    }
  }
  return [...map.values()];
}

export function MessageReactions({
  reactions,
  currentUserId,
  onToggle,
}: MessageReactionsProps) {
  const groups = useMemo(
    () => groupReactions(reactions, currentUserId),
    [reactions, currentUserId],
  );

  if (groups.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {groups.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={() => onToggle(g.emoji)}
          aria-pressed={g.byCurrentUser}
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] leading-none transition-colors"
          style={g.byCurrentUser
            ? { border: "1px solid rgba(43,111,219,0.60)", backgroundColor: "rgba(43,111,219,0.15)", color: "var(--ei-cobalt)" }
            : { border: "1px solid rgba(159,176,201,0.20)", backgroundColor: "rgba(159,176,201,0.08)", color: "var(--ei-offwhite)" }}
        >
          <span className="text-sm leading-none">{g.emoji}</span>
          {g.count > 1 && <span>{g.count}</span>}
        </button>
      ))}
    </div>
  );
}
