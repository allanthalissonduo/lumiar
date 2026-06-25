import type { ReactNode } from 'react';

export type ChipVariant = 'owner' | 'admin' | 'ok' | 'warn' | 'muted';

const VARIANT_STYLES: Record<ChipVariant, React.CSSProperties> = {
  owner: { border: "1px solid rgba(245,158,11,0.40)", backgroundColor: "rgba(245,158,11,0.10)", color: "#fcd34d" },
  admin: { border: "1px solid rgba(43,111,219,0.40)", backgroundColor: "rgba(43,111,219,0.12)", color: "var(--ei-cobalt)" },
  ok: { border: "1px solid rgba(16,185,129,0.35)", backgroundColor: "rgba(16,185,129,0.10)", color: "#34d399" },
  warn: { border: "1px solid rgba(245,158,11,0.40)", backgroundColor: "rgba(245,158,11,0.10)", color: "#fcd34d" },
  muted: { border: "1px solid rgba(159,176,201,0.22)", backgroundColor: "rgba(159,176,201,0.08)", color: "var(--ei-text-soft)" },
};

export function SettingsChip({
  variant = 'muted',
  className,
  children,
}: {
  variant?: ChipVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5 ${className ?? ''}`}
      style={{ ...VARIANT_STYLES[variant], fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone = 'ok',
  className,
}: {
  tone?: 'ok' | 'muted';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block size-1.5 shrink-0 rounded-full ${className ?? ''}`}
      style={{ backgroundColor: tone === 'ok' ? "#10b981" : "var(--ei-text-soft)" }}
    />
  );
}
