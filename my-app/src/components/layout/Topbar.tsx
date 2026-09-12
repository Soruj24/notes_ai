"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "@/src/components/ui/ThemeToggle";
import { Tooltip } from "@/src/components/ui/tooltip";
import { Menu, PanelLeft, Search, Sparkles } from "lucide-react";
import { NAV_SECTIONS } from "@/src/components/layout/nav";

interface TopbarProps {
  onMenu: () => void;
  onToggleSidebar: () => void;
  onSearch: () => void;
  onAssistant: () => void;
  notifications?: React.ReactNode;
}

function currentLabel(pathname: string): { section: string; label: string } {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { section: section.title, label: item.label };
      }
    }
  }
  return { section: "Workspace", label: "Overview" };
}

/** Sticky topbar. Fixed h-14 keeps content offset identical on every route. */
export function Topbar({ onMenu, onToggleSidebar, onSearch, onAssistant, notifications }: TopbarProps) {
  const pathname = usePathname() ?? "";
  const current = currentLabel(pathname);
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-zinc-200/80 bg-white/85 px-3 backdrop-blur-md sm:px-5 dark:border-zinc-800 dark:bg-zinc-950/80">
      <Tooltip content="Open navigation">
        <Button
          size="icon"
          variant="ghost"
          onClick={onMenu}
          aria-label="Open navigation"
          className="lg:hidden"
        >
          <Menu size={18} aria-hidden="true" className="leading-none" />
        </Button>
      </Tooltip>
      <Tooltip content="Toggle sidebar (⌘B)">
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="hidden h-8 w-8 lg:inline-flex"
        >
          <PanelLeft size={17} aria-hidden="true" className="leading-none" />
        </Button>
      </Tooltip>
      <nav aria-label="Breadcrumb" className="ml-1 hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
        <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{current.section}</span>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{current.label}</span>
      </nav>
      <Button
        variant="outline"
        onClick={onSearch}
        aria-label="Open command palette"
        className="ml-2 hidden min-w-0 flex-1 justify-start rounded-xl font-normal text-zinc-500 sm:inline-flex sm:max-w-xs lg:max-w-sm dark:text-zinc-400"
      >
        <Search size={15} aria-hidden="true" className="shrink-0" />
        <span className="truncate">Search or command…</span>
        <kbd className="ml-auto hidden shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 md:inline dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          ⌘K
        </kbd>
      </Button>
      <Tooltip content="Search (⌘K)">
        <Button
          size="icon"
          variant="ghost"
          onClick={onSearch}
          aria-label="Open command palette"
          className="ml-1 sm:hidden"
        >
          <Search size={18} aria-hidden="true" className="leading-none" />
        </Button>
      </Tooltip>
      <div className="ml-auto flex items-center gap-1.5">
        {notifications}
        <Button
          variant="secondary"
          size="sm"
          onClick={onAssistant}
          aria-label="Open AI Assistant"
          className="hidden rounded-full sm:inline-flex"
        >
          <Sparkles size={15} aria-hidden="true" />
          Ask AI
          <kbd className="rounded border border-zinc-900/10 bg-white/60 px-1 font-mono text-[10px] dark:border-white/15 dark:bg-black/20">
            Alt+A
          </kbd>
        </Button>
        <Tooltip content="AI Assistant (Alt+A)">
          <Button size="icon" variant="ghost" onClick={onAssistant} aria-label="Open AI Assistant" className="h-8 w-8 sm:hidden">
            <Sparkles size={17} aria-hidden="true" className="leading-none" />
          </Button>
        </Tooltip>
        <ThemeToggle />
        <Link
          href="/profile"
          aria-label="Open profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/[0.07] text-xs font-semibold text-zinc-700 ring-1 ring-zinc-900/10 transition-colors hover:bg-zinc-900/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-zinc-100/10 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-zinc-100/15"
        >
          <span aria-hidden="true">N</span>
        </Link>
      </div>
    </header>
  );
}
