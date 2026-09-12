import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { AIChat } from "@/src/components/assistant/AIChat";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "AI Assistant" };

/** Full-page assistant. Mounted fresh per visit (new thread each time). */
export default async function AssistantPage() {
  const { workspace } = await requireWorkspace("/assistant");
  return (
    <div className="fade-up mx-auto flex h-[calc(100dvh-15rem)] min-h-[26rem] w-full max-w-3xl flex-col gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
        >
          <Sparkles size={19} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            AI Assistant
          </h1>
          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
            Ask, command, and create — grounded in your workspace.
          </p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
        <AIChat wid={workspace.id} />
      </div>
    </div>
  );
}
