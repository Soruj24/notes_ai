import type { ReactNode } from "react";
import { cx } from "@/src/lib/utils/cx";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Centered empty/error placeholder with optional icon and action slot. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "mx-auto flex w-full max-w-md flex-col items-center px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-lg text-zinc-500 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:shadow-none"
        >
          {icon}
        </span>
      ) : null}
      <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
