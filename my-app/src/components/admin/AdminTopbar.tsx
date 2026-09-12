"use client";

import Link from "next/link";
import { ArrowLeft, Menu, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";
import { Tooltip } from "@/src/components/ui/tooltip";
import { AdminBell } from "@/src/components/admin/notifications/AdminBell";
import type { PlatformRole } from "@/src/lib/rbac/roles";

interface AdminTopbarProps {
  role: PlatformRole | null;
  onMenu: () => void;
  onCommand: () => void;
}

/** Console topbar: brand, role badge, command palette, theme, exit. */
export function AdminTopbar({ role, onMenu, onCommand }: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-zinc-800 dark:bg-black/70">
      <Button
        size="icon"
        variant="ghost"
        onClick={onMenu}
        aria-label="Open admin navigation"
        className="lg:hidden"
      >
        <Menu size={18} aria-hidden="true" />
      </Button>
      <span className="flex items-center gap-2 lg:hidden">
        <ShieldCheck size={16} aria-hidden="true" />
        <span className="text-sm font-semibold">Admin</span>
      </span>
      <Button
        variant="outline"
        onClick={onCommand}
        aria-label="Open admin command menu"
        className="ml-1 hidden min-w-0 flex-1 justify-start font-normal text-zinc-500 sm:inline-flex sm:max-w-xs dark:text-zinc-400"
      >
        <Search size={15} aria-hidden="true" className="shrink-0" />
        <span className="truncate">Go to…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-zinc-200 px-1.5 font-mono text-[11px] md:inline dark:border-zinc-700">
          ⌘K
        </kbd>
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <AdminBell />
        <Badge size="sm" tone="accent">
          {role ?? "NO ROLE"}
        </Badge>
        <Tooltip content="Back to application">
          <Link
            href="/dashboard"
            aria-label="Back to application"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  );
}
