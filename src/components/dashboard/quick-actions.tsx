"use client"

import Link from 'next/link'
import { UserPlus, Briefcase, Radio, Zap } from 'lucide-react'
import type { ComponentType } from 'react'

// Quick-action shortcuts. Each navigates to the page that owns the
// relevant "create" flow. We deliberately don't try to auto-open any
// modal on the target page — that'd require touching those pages,
// which is out of scope here.
interface Action {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  color: string
  bg: string
}

const ACTIONS: Action[] = [
  { label: 'Novo Contato',     href: '/contacts',       icon: UserPlus, color: "var(--ei-iris)",   bg: "rgba(26,184,160,0.10)" },
  { label: 'Novo Negócio',     href: '/pipelines',      icon: Briefcase, color: "#3b82f6",         bg: "rgba(59,130,246,0.10)" },
  { label: 'Novo Broadcast',   href: '/broadcasts/new', icon: Radio,    color: "#EAA40D",          bg: "rgba(234,164,13,0.10)" },
  { label: 'Nova Automação',   href: '/automations/new',icon: Zap,      color: "var(--ei-cobalt)", bg: "rgba(43,111,219,0.10)" },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
            style={{
              backgroundColor: "var(--ei-surface-card)",
              border: "1px solid rgba(159,176,201,0.18)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(43,111,219,0.40)"
              ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(43,111,219,0.06)"
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(159,176,201,0.18)"
              ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--ei-surface-card)"
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: a.bg, color: a.color }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {a.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
