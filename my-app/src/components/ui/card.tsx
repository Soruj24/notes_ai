import type { ReactNode } from "react";
import { cx } from "@/src/lib/utils/cx";

interface CardProps {
  className?: string;
  children: ReactNode;
}

/** Surface container: subtle border, restrained shadow, consistent padding. */
export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx("px-5 pt-5", className)}>{children}</div>;
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h3 className={cx("text-sm font-semibold tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={cx("mt-1 text-sm text-zinc-500", className)}>{children}</p>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-2 border-t border-zinc-100 px-5 py-3 dark:border-zinc-900",
        className,
      )}
    >
      {children}
    </div>
  );
}
