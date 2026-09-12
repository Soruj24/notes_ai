import type { ReactNode } from "react";
import { cx } from "@/src/lib/utils/cx";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

/**
 * Consistent page heading: title + description + actions.
 * Single pattern for every workspace surface (dashboard, notes, tasks…).
 */
export function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <div className={cx("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-[22px] leading-7 font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
