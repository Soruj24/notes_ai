/** Public auth layout. No workspace shell by design. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
