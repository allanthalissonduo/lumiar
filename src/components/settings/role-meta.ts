import {
  Crown,
  Shield,
  UserCog,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';

import type { AccountRole } from '@/lib/auth/roles';
import type { ChipVariant } from './settings-chip';

/**
 * Single source of truth for per-role chip metadata across settings
 * surfaces (the Overview identity chip and the Members roster/invite
 * chips). Previously duplicated in both files; hoisted here so a label,
 * icon, or colour change lands once.
 *
 * `variant` drives the token-based <SettingsChip>; `className` is the
 * inline Tailwind string the Members tab applies to its own spans.
 */
export const ROLE_META: Record<
  AccountRole,
  { icon: LucideIcon; label: string; variant: ChipVariant; className: string }
> = {
  owner: {
    icon: Crown,
    label: 'Proprietário',
    variant: 'owner',
    className: '',
  },
  admin: {
    icon: Shield,
    label: 'Admin',
    variant: 'admin',
    className: '',
  },
  agent: {
    icon: UserCog,
    label: 'Agente',
    variant: 'muted',
    className: '',
  },
  viewer: {
    icon: UserIcon,
    label: 'Visualizador',
    variant: 'muted',
    className: '',
  },
};
