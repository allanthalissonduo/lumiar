"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationStatus } from "@/types";
import { Search, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
  /**
   * Increment to force the fetch effect below to refire. The parent
   * bumps this on realtime reconnect / tab visibility → visible so the
   * list catches up on any events sent while the WS was disconnected
   * or the tab was throttled. Optional so existing callers keep working.
   */
  resyncToken?: number;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "bg-primary",
  pending: "bg-amber-500",
  closed: "bg-muted-foreground",
};

type InboxFilter = ConversationStatus | "all" | "unread";

const FILTER_OPTIONS: { label: string; value: InboxFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Closed", value: "closed" },
];

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  resyncToken = 0,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [loading, setLoading] = useState(true);

  // Keep the latest callback in a ref so the fetch effect below can
  // have a stable, empty-dep identity. Previously the fetch useCallback
  // depended on `onConversationsLoaded`, which depends on the parent's
  // `deepLinkConvId` — so every URL change (including one the parent
  // triggered via router.replace after a click) caused a fresh
  // conversations fetch. That extra refetch was the trigger for the
  // deep-link auto-select running a second time and wiping the active
  // thread's messages.
  // Mutation lives in an effect (not render) per React 19's refs rule;
  // the fetch runs once on mount so it's fine to read the slightly
  // older value — the very next render updates the ref for any
  // subsequent async completion.
  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, contact:contacts(*)")
        .order("last_message_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        // Supabase errors have non-enumerable properties — log fields explicitly
        console.error("Failed to fetch conversations:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setLoading(false);
        return;
      }

      onConversationsLoadedRef.current(data ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // `resyncToken` is included so the parent can force a refetch when
    // the realtime channel reconnects or the tab regains focus — catches
    // up on any events sent while the WS was disconnected or throttled.
  }, [resyncToken]);

  const filtered = useMemo(() => {
    let result = conversations;

    if (filter === "unread") {
      result = result.filter((c) => c.unread_count > 0);
    } else if (filter !== "all") {
      result = result.filter((c) => c.status === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
      });
    }

    return result;
  }, [conversations, filter, search]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleSelect = useCallback(
    (conv: Conversation) => {
      onSelect(conv);
    },
    [onSelect]
  );

  const activeFilter = FILTER_OPTIONS.find((o) => o.value === filter);

  // Group conversations: pinned (unread > 0) first, rest below
  const pinned = filtered.filter((c) => c.unread_count > 0);
  const rest = filtered.filter((c) => c.unread_count === 0);

  return (
    // w-full on mobile so the list occupies the whole viewport when it's
    // the single pane showing; fixed 320px on desktop where it shares the
    // row with the thread + contact sidebar.
    <div
      className="flex h-full w-full flex-col lg:w-80"
      style={{
        backgroundColor: "var(--ei-surface-card)",
        borderRight: "1px solid rgba(159,176,201,0.22)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(159,176,201,0.22)" }}
      >
        <h1
          className="mb-3 text-base font-semibold"
          style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Messages
        </h1>
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--ei-text-soft)" }}
          />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search conversations…"
            className="pl-9 text-sm"
            style={{
              backgroundColor: "rgba(159,176,201,0.08)",
              border: "1px solid rgba(159,176,201,0.22)",
              color: "var(--ei-offwhite)",
              borderRadius: "var(--ei-r-pill)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          />
        </div>

        {/* Filter pill row */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className="px-3 py-0.5 text-xs font-medium transition-colors"
              style={{
                borderRadius: "var(--ei-r-pill)",
                backgroundColor:
                  filter === opt.value
                    ? "var(--ei-cobalt)"
                    : "rgba(159,176,201,0.10)",
                color:
                  filter === opt.value
                    ? "#fff"
                    : "var(--ei-text-soft)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stories strip — active contacts (unread) as round avatars */}
      {pinned.length > 0 && (
        <div
          className="overflow-x-auto px-4 py-3 flex gap-3"
          style={{ borderBottom: "1px solid rgba(159,176,201,0.22)" }}
        >
          {pinned.map((conv) => {
            const name =
              conv.contact?.name || conv.contact?.phone || "?";
            const initials = name.charAt(0).toUpperCase();
            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div
                  className="p-0.5 rounded-full"
                  style={{
                    background: "var(--ei-cobalt)",
                    boxShadow: "var(--ei-glow-cobalt)",
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: "var(--ei-abyssal)",
                      color: "var(--ei-offwhite)",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {conv.contact?.avatar_url ? (
                      <img
                        src={conv.contact.avatar_url}
                        alt={name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                </div>
                <span
                  className="max-w-[3rem] truncate text-[10px]"
                  style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Conversation Items.
          `min-h-0` is load-bearing: a flex child defaults to
          min-height:auto, so without it this ScrollArea grows to fit
          every conversation instead of shrinking to the remaining
          space — the list then overflows and gets clipped by the
          parent's overflow-hidden with no scrollbar (issue #229). */}
      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--ei-cobalt)", borderTopColor: "transparent" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p
              className="text-sm"
              style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              No conversations found
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {pinned.length > 0 && (
              <p
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Pinned
              </p>
            )}
            {pinned.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
              />
            ))}
            {rest.length > 0 && pinned.length > 0 && (
              <p
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                All conversations
              </p>
            )}
            {rest.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: ConversationItemProps) {
  const contact = conversation.contact;
  const displayName = contact?.name || contact?.phone || "Unknown";
  const initials = displayName.charAt(0).toUpperCase();

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: false,
      })
    : "";

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
      style={{
        backgroundColor: isActive
          ? "rgba(43,111,219,0.12)"
          : "transparent",
        borderLeft: isActive
          ? "2px solid var(--ei-cobalt)"
          : "2px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(159,176,201,0.06)";
      }}
      onMouseLeave={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "transparent";
      }}
    >
      {/* Avatar */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        style={{
          backgroundColor: "rgba(43,111,219,0.18)",
          color: "var(--ei-cobalt)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {contact?.avatar_url ? (
          <img
            src={contact.avatar_url}
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-sm font-semibold"
            style={{
              color: "var(--ei-offwhite)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {displayName}
          </span>
          <span
            className="shrink-0 text-[10px]"
            style={{
              color: "var(--ei-text-soft)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {timeAgo}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className="truncate text-xs"
            style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {conversation.last_message_text || "No messages yet"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {conversation.unread_count > 0 && (
              <span
                className="flex h-4 min-w-4 items-center justify-center px-1 text-[10px] font-bold"
                style={{
                  backgroundColor: "var(--ei-cobalt)",
                  color: "#fff",
                  borderRadius: "var(--ei-r-pill)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {conversation.unread_count}
              </span>
            )}
            <span
              className={cn("h-2 w-2 rounded-full", STATUS_COLORS[conversation.status])}
              title={conversation.status}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
