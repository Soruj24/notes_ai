"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Segment boundary: shell stays mounted, only content swaps to this. */
export default function WorkspaceError({ error, reset }: ErrorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>This view failed to load</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-500">
          {error.digest
            ? `Error digest: ${error.digest}`
            : "Try again. Your navigation and sidebar state are preserved."}
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={reset}>Retry view</Button>
      </CardFooter>
    </Card>
  );
}
