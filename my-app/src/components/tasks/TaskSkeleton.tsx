import { Skeleton } from "@/src/components/ui/skeleton";

/** Loading placeholder matching the task list shape. */
export function TaskSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading tasks" className="grid gap-2">
      {["a", "b", "c", "d"].map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <Skeleton tone="circle" className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <Skeleton tone="text" className="mt-2 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
