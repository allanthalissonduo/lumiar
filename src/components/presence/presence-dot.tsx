import type { PresenceStatus } from "@/lib/presence";

const PRESENCE_DOT_STYLE: Record<PresenceStatus, React.CSSProperties> = {
  online: { backgroundColor: "#10b981" },
  away: { backgroundColor: "#f59e0b" },
  offline: { backgroundColor: "rgba(159,176,201,0.40)" },
};

export function PresenceDot({
  status,
  label,
  className,
}: {
  status: PresenceStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      title={label}
      className={`inline-block size-2 shrink-0 rounded-full${className ? ` ${className}` : ""}`}
      style={PRESENCE_DOT_STYLE[status]}
    />
  );
}
