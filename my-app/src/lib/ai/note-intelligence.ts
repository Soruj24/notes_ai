import { z } from "zod";
import { completeJson, completeText } from "@/src/lib/ai/complete";

/**
 * Note Intelligence: nine suggest-only operations. Every function returns
 * previewable suggestions and NEVER mutates user data — applying happens
 * in the UI through the standard notes/tasks/reminders APIs after explicit
 * user confirmation.
 */

export const NOTE_AI_ACTIONS = [
  "summarize",
  "rewrite",
  "extract_tasks",
  "extract_dates",
  "extract_reminders",
  "generate_tags",
  "generate_title",
  "generate_keywords",
  "ask",
] as const;

export type NoteAIAction = (typeof NOTE_AI_ACTIONS)[number];

export interface NoteSuggestion {
  kind: "task" | "reminder" | "tag" | "title" | "keyword" | "date";
  label: string;
  detail?: string;
  payload: Record<string, unknown>;
}

export interface NoteAIResult {
  action: NoteAIAction;
  /** Long-form output for summarize / rewrite / ask. */
  text?: string;
  suggestions: NoteSuggestion[];
}

const taskSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      dueAt: z.string().nullable().optional().describe("ISO date-time or null"),
    }),
  ),
});

const datesSchema = z.object({
  dates: z.array(
    z.object({
      label: z.string().describe("Original phrase, e.g. 'Tomorrow at 9 AM'"),
      iso: z.string().describe("Resolved ISO date-time"),
      kind: z.enum(["due", "reminder", "event", "other"]),
    }),
  ),
});

const remindersSchema = z.object({
  reminders: z.array(
    z.object({
      title: z.string(),
      remindAt: z.string().describe("ISO date-time"),
    }),
  ),
});

function context(title: string, body: string, now: Date): string {
  return `Current time: ${now.toISOString()}.\nNote title: ${title || "(untitled)"}\nNote body:\n${body || "(empty)"}`;
}

export async function summarizeNote(title: string, body: string): Promise<NoteAIResult> {
  const text = await completeText(
    "Summarize the note in 2–4 sentences. Preserve key facts, names, and numbers. Plain text only.",
    `Summarize this note:\nTitle: ${title}\nBody:\n${body}`,
  );
  return { action: "summarize", text, suggestions: [] };
}

export async function rewriteNote(title: string, body: string): Promise<NoteAIResult> {
  const text = await completeText(
    "Rewrite the note for clarity and structure: short paragraphs or bullets, same meaning, no new facts. Plain text only.",
    `Rewrite this note:\nTitle: ${title}\nBody:\n${body}`,
  );
  return { action: "rewrite", text, suggestions: [] };
}

export async function extractNoteTasks(
  title: string,
  body: string,
  now: Date,
): Promise<NoteAIResult> {
  const parsed = await completeJson<z.infer<typeof taskSchema>>(
    "Extract actionable tasks from the note. Resolve relative dates against the current time.",
    `${context(title, body, now)}\nReturn {"tasks":[{"title","dueAt"}]}. Omit dueAt when no date is stated.`,
  );
  const checked = taskSchema.parse(parsed);
  return {
    action: "extract_tasks",
    suggestions: checked.tasks.slice(0, 10).map((t) => ({
      kind: "task" as const,
      label: t.title,
      detail: t.dueAt ? new Date(t.dueAt).toLocaleString() : undefined,
      payload: { title: t.title, dueAt: t.dueAt ?? undefined },
    })),
  };
}

export async function extractNoteDates(
  title: string,
  body: string,
  now: Date,
): Promise<NoteAIResult> {
  const parsed = await completeJson<z.infer<typeof datesSchema>>(
    "Extract every date/time mention with its original phrase and resolved ISO value.",
    `${context(title, body, now)}\nReturn {"dates":[{"label","iso","kind"}]}. kind is due/reminder/event/other.`,
  );
  const checked = datesSchema.parse(parsed);
  return {
    action: "extract_dates",
    suggestions: checked.dates.slice(0, 10).map((d) => ({
      kind: "date" as const,
      label: d.label,
      detail: `${new Date(d.iso).toLocaleString()} · ${d.kind}`,
      payload: { iso: d.iso, kind: d.kind },
    })),
  };
}

export async function extractNoteReminders(
  title: string,
  body: string,
  now: Date,
): Promise<NoteAIResult> {
  const parsed = await completeJson<z.infer<typeof remindersSchema>>(
    "Extract things the user must be reminded about, each with a concrete ISO remindAt. Skip anything without a time.",
    `${context(title, body, now)}\nReturn {"reminders":[{"title","remindAt"}]}. Empty array when nothing time-bound exists.`,
  );
  const checked = remindersSchema.parse(parsed);
  return {
    action: "extract_reminders",
    suggestions: checked.reminders.slice(0, 10).map((r) => ({
      kind: "reminder" as const,
      label: r.title,
      detail: new Date(r.remindAt).toLocaleString(),
      payload: { title: r.title, remindAt: r.remindAt },
    })),
  };
}

export async function generateNoteTags(title: string, body: string): Promise<NoteAIResult> {
  const parsed = await completeJson<{ tags: string[] }>(
    "Generate 2–5 short lowercase tags for the note.",
    `Title: ${title}\nBody:\n${body}\nReturn {"tags":[...]}`,
  );
  const checked = z.object({ tags: z.array(z.string()) }).parse(parsed);
  return {
    action: "generate_tags",
    suggestions: checked.tags.slice(0, 5).map((t) => ({
      kind: "tag" as const,
      label: t.toLowerCase().trim(),
      payload: { name: t.toLowerCase().trim() },
    })),
  };
}

export async function generateNoteTitle(title: string, body: string): Promise<NoteAIResult> {
  const text = await completeText(
    "Write one crisp title (max 8 words) for the note. Title text only, no quotes.",
    `Current title: ${title}\nBody:\n${body}`,
  );
  return {
    action: "generate_title",
    suggestions: [
      { kind: "title" as const, label: text.split("\n")[0].slice(0, 120), payload: { title: text.split("\n")[0].slice(0, 120) } },
    ],
  };
}

export async function generateNoteKeywords(title: string, body: string): Promise<NoteAIResult> {
  const parsed = await completeJson<{ keywords: string[] }>(
    "Extract 3–8 salient keywords or key phrases from the note.",
    `Title: ${title}\nBody:\n${body}\nReturn {"keywords":[...]}`,
  );
  const checked = z.object({ keywords: z.array(z.string()) }).parse(parsed);
  return {
    action: "generate_keywords",
    suggestions: checked.keywords.slice(0, 8).map((k) => ({
      kind: "keyword" as const,
      label: k,
      payload: { keyword: k },
    })),
  };
}

export async function askAboutNote(
  title: string,
  body: string,
  question: string,
): Promise<NoteAIResult> {
  const text = await completeText(
    "Answer using ONLY the note below. If the answer is not in the note, say so plainly. Keep it under 150 words.",
    `Note title: ${title}\nNote body:\n${body}\nQuestion: ${question}`,
  );
  return { action: "ask", text, suggestions: [] };
}

export async function runNoteIntelligence(
  action: NoteAIAction,
  input: { title: string; body: string; question?: string },
  now = new Date(),
): Promise<NoteAIResult> {
  const { title, body } = input;
  switch (action) {
    case "summarize":
      return summarizeNote(title, body);
    case "rewrite":
      return rewriteNote(title, body);
    case "extract_tasks":
      return extractNoteTasks(title, body, now);
    case "extract_dates":
      return extractNoteDates(title, body, now);
    case "extract_reminders":
      return extractNoteReminders(title, body, now);
    case "generate_tags":
      return generateNoteTags(title, body);
    case "generate_title":
      return generateNoteTitle(title, body);
    case "generate_keywords":
      return generateNoteKeywords(title, body);
    case "ask": {
      if (!input.question?.trim()) {
        throw new Error("A question is required for the ask action.");
      }
      return askAboutNote(title, body, input.question);
    }
  }
}
