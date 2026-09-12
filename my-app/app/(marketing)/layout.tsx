/** Public layout. No workspace shell here by design. */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 sm:px-6 dark:border-zinc-800">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            N
          </span>
          NotoAI
        </span>
        <span className="text-xs text-zinc-500">Foundation preview</span>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
