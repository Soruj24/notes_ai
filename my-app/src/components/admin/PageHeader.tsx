import type { ReactNode } from "react";

/**
 * Standard admin page heading: eyebrow, title, description, action slot.
 * Server-safe (no interactivity of its own).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
