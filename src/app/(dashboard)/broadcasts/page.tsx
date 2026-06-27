'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Broadcast } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Radio, Plus, Loader2 } from 'lucide-react';
import { useCan } from '@/hooks/use-can';
import { GatedButton } from '@/components/ui/gated-button';
import { getBroadcastStatus } from '@/lib/broadcast-status';

/**
 * Poll cadence while any broadcast is sending. Kept modest so we don't
 * beat on Supabase — the aggregate trigger in migration 003 keeps
 * counts consistent; we just need to surface the freshest snapshot.
 */
const POLL_INTERVAL_MS = 5_000;

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function RateCell({
  value,
  total,
  barColor,
}: {
  value: number;
  total: number;
  barColor: string;
}) {
  const pct = percent(value, total);
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right text-xs tabular-nums" style={{ color: "var(--color-kraft-ocre)" }}>
        {pct}%
      </span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: "rgba(26,63,158,0.15)" }}>
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

export default function BroadcastsPage() {
  const router = useRouter();
  const canCreate = useCan('send-messages');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Used to kick off polling only while something is actively sending.
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchBroadcasts() {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBroadcasts(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const anySending = useMemo(
    () => broadcasts.some((b) => b.status === 'sending'),
    [broadcasts],
  );

  useEffect(() => {
    function startPolling() {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(fetchBroadcasts, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (!pollTimer.current) return;
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    // Pause polling while the tab is hidden — keeps Supabase cold when
    // the user is away, and ensures a fresh fetch the moment they
    // refocus so they don't see stale data on return.
    function handleVisibilityChange() {
      if (!anySending) return;
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        fetchBroadcasts();
        startPolling();
      }
    }

    if (anySending && document.visibilityState === 'visible') {
      startPolling();
    } else {
      stopPolling();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [anySending]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-electric)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top indeterminate progress bar: only visible while a broadcast
          is mid-send. Pure CSS animation so no extra deps. */}
      {anySending && (
        <div
          role="progressbar"
          aria-label="Broadcast in progress"
          className="broadcast-indeterminate fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden"
          style={{ background: "rgba(26,63,158,0.15)" }}
        >
          <div className="broadcast-indeterminate-bar h-0.5" style={{ background: "var(--color-electric)" }} />
          <style jsx>{`
            .broadcast-indeterminate-bar {
              width: 33%;
              transform: translateX(-100%);
              animation: broadcast-slide 1.6s cubic-bezier(0.4, 0, 0.2, 1)
                infinite;
            }
            @keyframes broadcast-slide {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(400%);
              }
            }
          `}</style>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Broadcasts</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Envie mensagens em massa para seus contatos usando templates aprovados.
          </p>
        </div>
        <GatedButton
          canAct={canCreate}
          gateReason="create broadcasts"
          onClick={() => router.push('/broadcasts/new')}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" } as React.CSSProperties}
        >
          <Plus className="h-4 w-4" />
          Novo broadcast
        </GatedButton>
      </div>

      {broadcasts.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl" style={{ border: "1px solid rgba(159,176,201,0.18)", backgroundColor: "var(--ei-surface-card)" }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(43,111,219,0.10)" }}>
            <Radio className="h-7 w-7" style={{ color: "var(--ei-cobalt)" }} />
          </div>
          <p className="mt-4 text-sm font-semibold" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Nenhum broadcast ainda</p>
          <p className="mt-1 text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Crie seu primeiro broadcast para alcançar contatos em escala.
          </p>
          <GatedButton
            canAct={canCreate}
            gateReason="create broadcasts"
            onClick={() => router.push('/broadcasts/new')}
            className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "var(--ei-cobalt)", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" } as React.CSSProperties}
          >
            <Plus className="h-4 w-4" />
            Criar broadcast
          </GatedButton>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(159,176,201,0.18)", backgroundColor: "var(--ei-surface-card)" }}>
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "rgba(43,111,219,0.25)" }} className="hover:bg-transparent">
                <TableHead style={{ color: "var(--color-kraft-ocre)" }}>Name</TableHead>
                <TableHead className="hidden md:table-cell" style={{ color: "var(--color-kraft-ocre)" }}>Template</TableHead>
                <TableHead className="hidden text-right sm:table-cell" style={{ color: "var(--color-kraft-ocre)" }}>
                  Recipients
                </TableHead>
                <TableHead className="hidden lg:table-cell" style={{ color: "var(--color-kraft-ocre)" }}>Delivery</TableHead>
                <TableHead className="hidden lg:table-cell" style={{ color: "var(--color-kraft-ocre)" }}>Read</TableHead>
                <TableHead style={{ color: "var(--color-kraft-ocre)" }}>Status</TableHead>
                <TableHead className="hidden sm:table-cell" style={{ color: "var(--color-kraft-ocre)" }}>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((broadcast) => {
                const status = getBroadcastStatus(broadcast.status);
                return (
                  <TableRow
                    key={broadcast.id}
                    className="cursor-pointer hover:bg-transparent"
                    style={{ borderColor: "rgba(43,111,219,0.25)" }}
                    onClick={() => router.push(`/broadcasts/${broadcast.id}`)}
                  >
                    <TableCell className="font-medium" style={{ color: "var(--color-off-white)" }}>
                      {broadcast.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell" style={{ color: "var(--color-kraft-ocre)" }}>
                      {broadcast.template_name}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell" style={{ color: "var(--color-kraft-ocre)" }}>
                      {broadcast.total_recipients}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <RateCell
                        value={broadcast.delivered_count}
                        total={broadcast.total_recipients}
                        barColor="var(--color-electric)"
                      />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <RateCell
                        value={broadcast.read_count}
                        total={broadcast.total_recipients}
                        barColor="#3b82f6"
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}
                      >
                        {status.pulse && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400" />
                          </span>
                        )}
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" style={{ color: "var(--color-kraft-ocre)" }}>
                      {new Date(broadcast.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
