import { Skeleton, SkeletonLines } from "@/src/components/ui/skeleton";

/**
 * Content-area skeleton. Shell (sidebar/topbar) stays mounted, so navigation
 * shows this in MainContent only — same container width, no layout jump.
 */
export default function WorkspaceLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="h-8 w-44" />
      <Skeleton tone="text" className="w-72" />
      <SkeletonLines className="mt-2" />
    </div>
  );
}
