"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { adminCrumbs } from "@/src/components/admin/admin-nav";

/** Path breadcrumb for admin pages. Last crumb is current (aria-current). */
export function AdminBreadcrumb() {
  const pathname = usePathname() ?? "/admin";
  const crumbs = adminCrumbs(pathname);
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 ? (
                <ChevronRight size={12} aria-hidden="true" className="shrink-0 text-zinc-400" />
              ) : null}
              <li className="min-w-0">
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="truncate hover:text-zinc-900 dark:hover:text-zinc-100">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
