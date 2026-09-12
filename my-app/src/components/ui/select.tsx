import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cx, fieldChrome, fieldLabel, type UISize } from "@/src/lib/utils/cx";

const sizes: Record<UISize, string> = {
  sm: "h-8 pl-2.5 pr-8 text-xs",
  md: "h-9 pl-3 pr-9 text-sm",
  lg: "h-11 pl-4 pr-10 text-sm",
};

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: UISize;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
}

/** Styled native select: full keyboard + screen-reader support for free. */
export function Select({
  size = "md",
  label,
  hint,
  error,
  invalid,
  id,
  className,
  children,
  ...rest
}: SelectProps) {
  const describedBy =
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const isInvalid = invalid ?? Boolean(error);
  return (
    <div className={cx("w-full", className)}>
      {label ? (
        <label htmlFor={id} className={fieldLabel}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={id}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          {...rest}
          className={cx(
            "w-full cursor-pointer appearance-none rounded-lg bg-white dark:bg-zinc-950",
            sizes[size],
            fieldChrome,
            isInvalid &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500",
          )}
        >
          {children}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
        >
          <ChevronDown size={14} />
        </span>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
