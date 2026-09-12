import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";

interface AuthCardProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered auth surface shared by login and register. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          N
        </span>
        <span className="text-sm font-semibold">NotoAI</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer ? (
          <div className="border-t border-zinc-100 px-5 py-3 text-center text-sm text-zinc-500 dark:border-zinc-900">
            {footer}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
