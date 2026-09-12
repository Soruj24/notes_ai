import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cx } from "@/src/lib/utils/cx";

interface DashboardSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
}

/** Consistent section shell: icon + heading + description + link + content. */
export function DashboardSection({
  title,
  description,
  icon,
  actionHref,
  actionLabel,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section
      aria-label={title}
      className={cx(
        "rounded-xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none",
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
        {actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
          >
            {(actionLabel ?? "View all").replace(/\s*→\s*$/, "")}
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
