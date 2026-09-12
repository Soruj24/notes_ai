import type { ReactNode, TextareaHTMLAttributes } from "react";
import { cx, fieldChrome, fieldLabel, type UISize } from "@/src/lib/utils/cx";

const sizes: Record<UISize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm",
};

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: UISize;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
}

/** Labeled multiline input. Same visual language as Input. */
export function Textarea({
  size = "md",
  label,
  hint,
  error,
  invalid,
  id,
  className,
  rows = 3,
  ...rest
}: TextareaProps) {
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
      <textarea
        id={id}
        rows={rows}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        {...rest}
        className={cx(
          "w-full resize-y rounded-lg leading-6 placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
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
