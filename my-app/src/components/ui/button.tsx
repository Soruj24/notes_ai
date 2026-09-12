import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { cx, focusRing } from "@/src/lib/utils/cx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:shadow-none dark:hover:bg-white",
  secondary:
    "bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 active:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:active:bg-zinc-700",
  outline:
    "border border-zinc-200 bg-white text-zinc-900 shadow-[0_1px_2px_rgb(0_0_0/0.05)] hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-100 dark:shadow-none dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:active:bg-zinc-800",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 dark:active:bg-zinc-800",
  destructive:
    "bg-red-600 text-white shadow-sm hover:bg-red-500 active:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
  icon: "h-9 w-9 touch-44",
};

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

type ButtonProps = BaseProps &
  (
    | ({ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>)
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  );

/** Single button primitive. `href` renders an anchor; otherwise a button. */
export function Button(props: ButtonProps & { ref?: Ref<HTMLButtonElement | HTMLAnchorElement> }) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    ref,
    ...rest
  } = props;
  const classes = cx(base, variants[variant], sizes[size], focusRing, className);
  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorProps } = rest;
    return (
      <a
        href={href}
        ref={ref as Ref<HTMLAnchorElement>}
        {...anchorProps}
        className={classes}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type={(rest as ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button"}
      ref={ref as Ref<HTMLButtonElement>}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      className={classes}
    >
      {children}
    </button>
  );
}
