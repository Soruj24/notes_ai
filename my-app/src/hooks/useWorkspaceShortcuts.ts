"use client";

import { useRouter } from "next/navigation";
import { useShortcut } from "@/src/hooks/useShortcut";
import { useToast } from "@/src/components/ui/toast";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_IDS,
} from "@/src/lib/keyboard/defaults";

interface WorkspaceShortcutOptions {
  wid: string | null;
  onAssistant: () => void;
  onHelp: () => void;
}

/**
 * Global workspace actions: create + navigate. Creation POSTs an untitled
 * draft and lands in its editor; every action also lives in the palette
 * for contexts where the browser reserves the chord.
 */
export function useWorkspaceShortcuts({ wid, onAssistant, onHelp }: WorkspaceShortcutOptions): void {
  const router = useRouter();
  const { toast } = useToast();

  async function createAndOpen(kind: "notes" | "tasks") {
    if (!wid) {
      toast("Workspace is still loading.", { tone: "warning" });
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${wid}/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: kind === "notes" ? "Untitled note" : "Untitled task" }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as {
        note?: { id: string };
        task?: { id: string };
      };
      const id = kind === "notes" ? json.note?.id : json.task?.id;
      if (!id) throw new Error();
      router.push(`/${kind === "notes" ? "notes" : "tasks"}/${id}`);
    } catch {
      toast(`Could not create the ${kind === "notes" ? "note" : "task"}.`, {
        tone: "danger",
      });
    }
  }

  useShortcut(
    SHORTCUT_IDS.newNote,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.newNote],
    () => void createAndOpen("notes"),
    { description: "New note" },
  );
  useShortcut(
    SHORTCUT_IDS.newTask,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.newTask],
    () => void createAndOpen("tasks"),
    { description: "New task" },
  );
  useShortcut(
    SHORTCUT_IDS.openAi,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.openAi],
    onAssistant,
    { description: "Open AI assistant" },
  );
  useShortcut(
    SHORTCUT_IDS.goDashboard,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.goDashboard],
    () => router.push("/dashboard"),
    { description: "Go to dashboard" },
  );
  useShortcut(
    SHORTCUT_IDS.goNotes,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.goNotes],
    () => router.push("/notes"),
    { description: "Go to notes" },
  );
  useShortcut(
    SHORTCUT_IDS.goTasks,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.goTasks],
    () => router.push("/tasks"),
    { description: "Go to tasks" },
  );
  useShortcut(
    SHORTCUT_IDS.showHelp,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.showHelp],
    onHelp,
    { description: "Keyboard shortcut help" },
  );
}
