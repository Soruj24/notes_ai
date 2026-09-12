import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";

export default function MarketingHome() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-24 text-center sm:px-6">
      <Badge tone="accent">Foundation preview</Badge>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        NotoAI productivity workspace
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-400">
        Foundation is ready: app shell, design system, theming, and keyboard
        architecture are in place. Notes, tasks, calendar, and AI features land
        in the next phases.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button href="/notes" size="lg" className="rounded-full">
          Open workspace
        </Button>
        <Button href="/search" size="lg" variant="outline" className="rounded-full">
          ⌘K · ⌘B · Alt+T ready
        </Button>
      </div>
      <Card className="mt-12 w-full text-left">
        <CardContent>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Design system
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Buttons, inputs, dialogs, toasts, command menu, tabs, tables, and
            more — one Tailwind-only primitive set shared by every surface.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
