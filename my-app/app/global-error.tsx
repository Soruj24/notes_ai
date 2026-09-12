"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Last-resort boundary: must render its own <html>/<body>. */
export default function RootGlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="bg-white text-zinc-950 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-4 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm opacity-70">
            {error.digest ? `Error digest: ${error.digest}` : "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
