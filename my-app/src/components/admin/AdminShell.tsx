"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@/src/components/ui/drawer";
import { AdminBreadcrumb } from "@/src/components/admin/AdminBreadcrumb";
import { AdminCommandMenu } from "@/src/components/admin/AdminCommandMenu";
import { AdminSidebar } from "@/src/components/admin/AdminSidebar";
import { AdminTopbar } from "@/src/components/admin/AdminTopbar";
import {
  ADMIN_SECTIONS,
  isAdminActive,
} from "@/src/components/admin/admin-nav";
import { filterNavSections, type PlatformRole } from "@/src/lib/rbac/roles";

/**
 * Persistent console shell. Mounted once by the (admin) layout; navigating
 * between /admin routes swaps only the content column. Sidebar is always
 * dark — the marker separating admin from the user application.
 */
export function AdminShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: PlatformRole | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const pathname = usePathname() ?? "/admin";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sections = filterNavSections(ADMIN_SECTIONS, role);

  return (
    <div className="flex min-h-dvh bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-2 focus:rounded-lg focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <AdminSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          role={role}
          onMenu={() => setMobileOpen(true)}
          onCommand={() => setCommandOpen(true)}
        />
        <main
          id="admin-content"
          className="mx-auto grid w-full max-w-7xl content-start gap-4 px-4 pt-5 pb-16 sm:px-6"
        >
          <AdminBreadcrumb />
          {children}
        </main>
      </div>
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="left"
        label="Admin navigation"
        className="lg:hidden"
      >
        <nav aria-label="Admin navigation" className="px-2 py-2">
          {sections.map((section) => (
            <div key={section.title} className="mt-4 first:mt-2">
              <p className="px-2 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
                {section.title}
              </p>
              <ul className="mt-1 space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isAdminActive(pathname, item.href) ? "page" : undefined}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:hover:bg-zinc-900"
                      >
                        <Icon size={15} aria-hidden="true" className="shrink-0 text-zinc-500" />
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
      {commandOpen ? (
        <AdminCommandMenu open onClose={() => setCommandOpen(false)} role={role} />
      ) : null}
    </div>
  );
}
