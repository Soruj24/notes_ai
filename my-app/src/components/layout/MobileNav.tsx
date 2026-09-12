"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS, isNavActive } from "@/src/components/layout/nav";
import { navIcon } from "@/src/components/layout/nav-icons";
import { Drawer } from "@/src/components/ui/drawer";
import { filterNavSections, type PlatformRole } from "@/src/lib/rbac/roles";
import { useFeatures } from "@/src/lib/features/client";
import { cx } from "@/src/lib/utils/cx";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  role: PlatformRole | null;
  siteName: string;
}

/** Mobile navigation built on the Drawer primitive. */
export function MobileNav({ open, onClose, role, siteName }: MobileNavProps) {
  const pathname = usePathname() ?? "";
  const { enabled, loaded } = useFeatures();
  const sections = filterNavSections(NAV_SECTIONS, role)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.flag || !loaded || enabled(item.flag)),
    }))
    .filter((section) => section.items.length > 0);
  return (
    <Drawer open={open} onClose={onClose} side="left" label={siteName} className="lg:hidden">
      <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-zinc-900 text-[15px] font-bold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          {siteName.charAt(0).toUpperCase() || "N"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight">{siteName}</span>
          <span className="block text-[11px] text-zinc-500">Workspace</span>
        </span>
      </div>
      <nav aria-label="Workspace navigation" className="px-2.5 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mt-5 first:mt-1">
            <p className="px-2 text-[11px] font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
              {section.title}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(pathname, item);
                const Icon = navIcon(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                        active
                          ? "bg-zinc-900/[0.06] font-semibold text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-50"
                          : "font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.06]",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          "flex h-7 w-7 items-center justify-center rounded-md",
                          active
                            ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                            : "text-zinc-500 dark:text-zinc-500",
                        )}
                      >
                        <Icon size={15} />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </Drawer>
  );
}
