import { RotateCcw, Sparkles } from "lucide-react";
import { AIActionCard } from "@/src/components/assistant/AIActionCard";
import { AIToolResult } from "@/src/components/assistant/AIToolResult";
import type { ChatMsg } from "@/src/components/assistant/types";

interface AIMessageProps {
  message: ChatMsg;
  onRetry?: () => void;
}

/** Single chat bubble: user right, assistant left with cards + tool log. */
export function AIMessage({ message, onRetry }: AIMessageProps) {
  const isUser = message.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2.5 text-sm leading-6 text-white sm:max-w-[75%] dark:bg-zinc-100 dark:text-zinc-900">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
      >
        <Sparkles size={14} />
      </span>
      <div className="min-w-0 max-w-[90%] flex-1 rounded-2xl rounded-tl-md border border-zinc-200/90 bg-zinc-50/60 px-3.5 py-2.5 text-sm leading-6 text-zinc-800 sm:max-w-[85%] dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
        {message.error ? (
          <div className="grid gap-2">
            <p role="alert" className="text-red-600 dark:text-red-400">
              {message.error}
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Try again
              </button>
            ) : null}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">
            {message.content}
            {message.streaming ? (
              <span aria-hidden="true" className="ml-1.5 inline-flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400"
                    style={{ animationDelay: `${i * 180}ms` }}
                  />
                ))}
              </span>
            ) : null}
          </p>
        )}
        {message.actions && message.actions.length > 0 ? (
          <div className="mt-2 grid gap-1.5">
            {message.actions.map((action, i) => (
              <AIActionCard key={`${action.type}-${i}`} action={action} />
            ))}
          </div>
        ) : null}
        {message.tools && message.tools.length > 0 ? (
          <div className="mt-2 grid gap-1.5">
            {message.tools.map((tool, i) => (
              <AIToolResult key={`${tool.name}-${i}`} name={tool.name} summary={tool.summary} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
