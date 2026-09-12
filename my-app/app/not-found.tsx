import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon="404"
      title="Page not found"
      description="The page you are looking for does not exist yet. Feature routes land in upcoming phases."
      action={<Button href="/">Back home</Button>}
    />
  );
}
