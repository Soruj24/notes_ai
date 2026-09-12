import { Skeleton } from "@/src/components/ui/skeleton";

/** Loading placeholder matching the notes list shape. */
export function NoteSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-2">
      {["a", "b", "c", "d"].map((k) => (
        <div
          key={k}
          className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton tone="text" className="mt-2 w-full" />
          <Skeleton tone="text" className="mt-1 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Loading placeholder matching the editor shape. */
export function NoteEditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading note" className="mx-auto grid w-full max-w-3xl gap-4">
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="rounded-2xl border border-zinc-200/90 p-5 sm:p-8 dark:border-zinc-800">
        <Skeleton tone="text" className="h-8 w-2/3" />
        <Skeleton className="mt-5 h-64 w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
