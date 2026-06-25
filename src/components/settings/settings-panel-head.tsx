import type { ReactNode } from 'react';

export function SettingsPanelHead({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className ?? ''}`}
    >
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-[62ch] text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
