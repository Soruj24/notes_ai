"use client";

import { useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Drawer } from "@/src/components/ui/drawer";
import { useToast } from "@/src/components/ui/toast";
import { formatDateTime } from "./NotificationsTable";
import { inboxApi, type InboxItem, type Priority, type Severity } from "./types";

const severityTone: Record<Severity, "neutral" | "warning" | "danger"> = {
  info: "neutral",
  warning: "warning",
  critical: "danger",
};

const priorityTone: Record<Priority, "neutral" | "accent" | "warning" | "danger"> = {
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-4 py-4 last:border-0 dark:border-zinc-900">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">{title}</h3>
      {children}
    </div>
  );
}

/** Item detail: full body, source, action link, acknowledge. Read-only otherwise. */
export function NotificationDrawer({
  item,
  onClose,
  onMarkedRead,
}: {
  item: InboxItem | null;
  onClose: () => void;
  onMarkedRead: (id: string) => void;
}) {
  const { toast } = useToast();
  const [marking, setMarking] = useState(false);

  async function markRead() {
    if (!item || marking || item.read) return;
    setMarking(true);
    try {
      await inboxApi.markRead(item.id);
      onMarkedRead(item.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    } finally {
      setMarking(false);
    }
  }

  return (
    <Drawer open={item !== null} onClose={onClose} side="right" label="Notification">
      {item ? (
        <div>
          <Section title="Notification">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge size="sm" tone={priorityTone[item.priority]}>
                {item.priority.toUpperCase()}
              </Badge>
              <Badge size="sm" tone={severityTone[item.severity]}>
                {item.severity}
              </Badge>
              <Badge size="sm" tone="neutral">
                {item.source}
              </Badge>
            </div>
            <h4 className="mt-2 text-sm font-semibold">{item.title}</h4>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{item.body}</p>
            <p className="mt-2 text-xs text-zinc-500">{formatDateTime(item.createdAt)}</p>
          </Section>
          <Section title="Actions">
            <div className="flex flex-wrap gap-1.5">
              {item.linkHref ? (
                <Button type="button" size="sm" variant="secondary" href={item.linkHref}>
                  Open related page
                </Button>
              ) : null}
              {!item.read ? (
                <Button type="button" size="sm" variant="outline" onClick={markRead} disabled={marking}>
                  {marking ? "Marking…" : "Mark as read"}
                </Button>
              ) : (
                <p className="text-xs text-zinc-500">Acknowledged.</p>
              )}
            </div>
          </Section>
        </div>
      ) : null}
    </Drawer>
  );
}
