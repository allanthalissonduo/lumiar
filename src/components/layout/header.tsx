"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, Settings as SettingsIcon, User } from "lucide-react";
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
import { ModeToggle } from "@/components/layout/mode-toggle";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/contacts": "Contacts",
  "/pipelines": "Pipelines",
  "/broadcasts": "Broadcasts",
  "/automations": "Automations",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "Dashboard";
}

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const title = getPageTitle(pathname);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 lg:px-6" style={{ backgroundColor: "var(--ei-abyssal)", borderBottom: "1px solid rgba(159,176,201,0.18)" }}>
      <div className="flex min-w-0 items-center gap-2">
        {/* Hamburger — mobile only. 44×44 hit target per Apple HIG. */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-md transition-colors lg:hidden"
          style={{ color: "var(--ei-text-soft)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold sm:text-lg" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ModeToggle />

        <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors focus:outline-none sm:gap-3 sm:pl-1 sm:pr-3"
          aria-label="Open account menu"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(159,176,201,0.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
        >
          <Avatar className="size-8">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Avatar"} />
            ) : null}
            <AvatarFallback className="text-sm font-medium" style={{ backgroundColor: "rgba(43,111,219,0.14)", color: "var(--ei-cobalt)" }}>
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {profile?.full_name ?? "Usuário"}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-56"
          style={{ backgroundColor: "#0d1e36", border: "1px solid rgba(43,111,219,0.30)" } as React.CSSProperties}
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium" style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {profile?.full_name ?? "Usuário"}
            </p>
            <p className="truncate text-xs" style={{ color: "var(--ei-text-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {profile?.email ?? ""}
            </p>
          </div>
          <DropdownMenuSeparator style={{ backgroundColor: "rgba(159,176,201,0.14)" }} />
          <DropdownMenuItem
            render={
              <Link href="/settings?tab=profile" />
            }
            style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" } as React.CSSProperties}
          >
            <User className="size-4" />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link href="/settings?tab=whatsapp" />
            }
            style={{ color: "var(--ei-offwhite)", fontFamily: "'Plus Jakarta Sans', sans-serif" } as React.CSSProperties}
          >
            <SettingsIcon className="size-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuSeparator style={{ backgroundColor: "rgba(159,176,201,0.14)" }} />
          <DropdownMenuItem
            onClick={signOut}
            style={{ color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif" } as React.CSSProperties}
          >
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
