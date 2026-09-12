/**
 * Stable content wrapper: identical padding/width on every route.
 * Extra bottom padding on mobile clears the bottom navigation.
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="min-h-[calc(100dvh-3.5rem)] w-full bg-zinc-50/60 dark:bg-black"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-12">
        {children}
      </div>
    </main>
  );
}
