"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import {
  Bot,
  Crown,
  GitBranch,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Radio,
  Settings,
  Shield,
  ShoppingCart,
  User,
  UserCog,
  Users,
  UsersRound,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/roles";

const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; label: string; className: string }
> = {
  owner: {
    icon: Crown,
    label: "Owner",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  admin: {
    icon: Shield,
    label: "Admin",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  agent: {
    icon: UserCog,
    label: "Agent",
    className: "border-border bg-muted text-foreground",
  },
  viewer: {
    icon: User,
    label: "Viewer",
    className: "border-border bg-card text-muted-foreground",
  },
};

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  beta?: boolean;
  /** Renders a small colored dot indicator (e.g. for unread count) */
  indicatorKey?: "unread";
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare, indicatorKey: "unread" },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/pipelines", label: "Pipelines", icon: GitBranch },
  { href: "/broadcasts", label: "Broadcasts", icon: Radio },
  { href: "/automations", label: "Automações", icon: Zap },
  { href: "/flows", label: "Flows", icon: Workflow, beta: true },
];

const aiNavItems: NavItem[] = [
  { href: "/agents", label: "Agente IA", icon: Bot },
  { href: "/wa-flows", label: "WA Flows", icon: Layers, beta: true },
  { href: "/catalog", label: "Catálogo", icon: Package, beta: true },
  { href: "/vtex", label: "VTEX Commerce", icon: ShoppingCart },
];

const bottomNavItems = [
  { href: "/settings", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();

  const showAccountStrip =
    !profileLoading &&
    !!account?.name &&
    account.name !== profile?.full_name;

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function NavLink({ item }: { item: NavItem }) {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    const showUnreadDot =
      item.indicatorKey === "unread" && totalUnread > 0 && !isActive;

    return (
      <li>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.beta && (
            <span
              aria-label="Beta"
              className="rounded-full border border-[var(--ei-kraft)]/40 bg-[var(--ei-kraft)]/10 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-[var(--ei-kraft)]"
            >
              Beta
            </span>
          )}
          {showUnreadDot && (
            <span
              aria-label={`${totalUnread} não lidas`}
              className="relative flex h-2 w-2 shrink-0"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </Link>
      </li>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-border bg-sidebar",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:w-56 lg:translate-x-0 lg:transition-none",
        )}
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            {/* Compass rose mark */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <circle cx="14" cy="14" r="12" stroke="var(--ei-royal)" strokeWidth="1" />
              <circle cx="14" cy="14" r="2" fill="var(--ei-cobalt)" />
              <line x1="14" y1="2" x2="14" y2="26" stroke="var(--ei-text-soft)" strokeWidth="0.6" opacity="0.35" />
              <line x1="2" y1="14" x2="26" y2="14" stroke="var(--ei-text-soft)" strokeWidth="0.6" opacity="0.35" />
              <polygon points="14,2.5 15.4,12 14,14 12.6,12" fill="var(--ei-cobalt)" />
              <polygon points="25.5,14 16,15.4 14,14 16,12.6" fill="var(--ei-royal)" />
              <polygon points="14,25.5 12.6,16 14,14 15.4,16" fill="var(--ei-royal)" />
              <polygon points="2.5,14 12,12.6 14,14 12,15.4" fill="var(--ei-text-soft)" opacity="0.5" />
            </svg>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Lumiar
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu principal">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </ul>

          {/* AI section */}
          <div className="my-3 px-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                IA
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          <ul className="flex flex-col gap-0.5">
            {aiNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </ul>

          <div className="my-3 border-t border-border" />

          <ul className="flex flex-col gap-0.5">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          {showAccountStrip && account?.name ? (
            <div className="mb-2 flex items-center gap-2 px-3 text-xs text-muted-foreground">
              <UsersRound className="size-3.5 shrink-0" />
              <span className="truncate" title={account.name}>
                {account.name}
              </span>
              {accountRole ? (
                (() => {
                  const meta = ROLE_CHIP[accountRole];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.className}`}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </span>
                  );
                })()
              ) : null}
            </div>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none data-popup-open:bg-muted/60">
              <Avatar className="size-7 shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.full_name ?? "Usuário"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.email ?? ""}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-52 bg-popover text-popover-foreground ring-border"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
