"use client";

import { X } from "lucide-react";
import type { Message } from "@/types";

interface ReplyQuoteProps {
  authorLabel: string;
  preview: string;
  onDismiss?: () => void;
  /** True when embedded inside an outbound bubble */
  onPrimary?: boolean;
}

export function ReplyQuote({
  authorLabel,
  preview,
  onDismiss,
  onPrimary = false,
}: ReplyQuoteProps) {
  const isChip = !!onDismiss;
  return (
    <div
      className="flex items-start gap-2 border-l-2 px-2 py-1"
      style={{
        borderLeftColor: onPrimary ? "rgba(255,255,255,0.50)" : "var(--ei-cobalt)",
        backgroundColor: isChip
          ? "rgba(159,176,201,0.10)"
          : onPrimary
            ? "rgba(255,255,255,0.12)"
            : "rgba(159,176,201,0.08)",
        borderRadius: "6px",
        marginBottom: isChip ? undefined : "6px",
      }}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className="truncate text-[11px] font-medium"
          style={{ color: onPrimary ? "rgba(255,255,255,0.90)" : "var(--ei-cobalt)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {authorLabel}
        </div>
        <div
          className="whitespace-pre-wrap break-words text-xs"
          style={{ color: onPrimary ? "rgba(255,255,255,0.75)" : "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {preview}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cancelar resposta"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
          style={{ color: "var(--ei-text-soft)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-offwhite)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ei-text-soft)"; }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Build the one-line preview text shown inside a reply quote. */
export function buildReplyPreview(message: Message): string {
  if (message.content_text) return message.content_text;
  switch (message.content_type) {
    case "image":
      return "[Imagem]";
    case "video":
      return "[Vídeo]";
    case "audio":
      return "[Áudio]";
    case "document":
      return "[Documento]";
    case "location":
      return "[Localização]";
    case "template":
      return "[Template]";
    default:
      return "[Mensagem]";
  }
}
