import { SkeletonLines } from "@/src/components/ui/skeleton";

/** Global fallback. Segment-level loading.tsx files keep the shell mounted. */
export default function GlobalLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <SkeletonLines className="mt-6" />
    </div>
  );
}
