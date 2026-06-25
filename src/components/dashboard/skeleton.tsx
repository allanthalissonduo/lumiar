import { cn } from '@/lib/utils'

/**
 * Shared skeleton primitive — a pulsing slate block sized to whatever
 * container it's dropped into. Used by every dashboard widget while
 * its data fetches.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md', className)} style={{ backgroundColor: "rgba(159,176,201,0.10)" }} />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-xl p-5', className)}
      style={{
        backgroundColor: "var(--ei-surface-card)",
        border: "1px solid rgba(159,176,201,0.18)",
      }}
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-16" />
    </div>
  )
}
