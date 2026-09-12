import type { InputHTMLAttributes, ReactNode } from "react";
import { cx, fieldChrome, fieldLabel, type UISize } from "@/src/lib/utils/cx";

const sizes: Record<UISize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-4 text-sm",
};

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: UISize;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
}

/** Labeled text input with hint/error slots and aria wiring. */
export function Input({
  size = "md",
  label,
  hint,
  error,
  invalid,
  id,
  className,
  ...rest
}: InputProps) {
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
      <input
        id={id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        {...rest}
        className={cx(
          "w-full rounded-lg placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
          sizes[size],
          fieldChrome,
          isInvalid &&
            "border-red-500 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500",
        )}
      />
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
