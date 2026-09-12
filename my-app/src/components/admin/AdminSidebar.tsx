"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ADMIN_SECTIONS, isAdminActive } from "@/src/components/admin/admin-nav";
import { filterNavSections, type PlatformRole } from "@/src/lib/rbac/roles";

/**
 * Console sidebar. Always dark (zinc-950) in both modes — the primary
 * visual marker separating admin from the user application.
 */
export function AdminSidebar({ role }: { role: PlatformRole | null }) {
  const pathname = usePathname() ?? "/admin";
  const sections = filterNavSections(ADMIN_SECTIONS, role);
  return (
    <aside
      aria-label="Admin navigation"
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-zinc-950 text-zinc-200 lg:flex dark:border-r dark:border-zinc-800"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-950"
        >
          <ShieldCheck size={17} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">Admin Console</span>
          <span className="block text-[11px] tracking-widest text-zinc-400 uppercase">NotoAI</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mt-4 first:mt-0">
            <p className="px-2 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">
              {section.title}
            </p>
            <ul className="mt-1 space-y-0.5">
              {section.items.map((item) => {
                const active = isAdminActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 ${
                        active
                          ? "bg-white/10 font-medium text-white"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                      }`}
                    >
                      <Icon size={15} aria-hidden="true" className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <p className="shrink-0 border-t border-white/10 px-4 py-3 font-mono text-[11px] text-zinc-500">
        {role ?? "NO ROLE"}
      </p>
    </aside>
  );
}
