import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { isAIConfigured } from "@/src/lib/ai/config";
import { isFeatureEnabled } from "@/src/lib/features/evaluation";
import {
  NOTE_AI_ACTIONS,
  runNoteIntelligence,
  type NoteAIAction,
} from "@/src/lib/ai/note-intelligence";
import { getUserNote } from "@/src/services/note.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/**
 * POST /api/workspaces/[wid]/notes/[id]/ai — suggest-only intelligence.
 * { action, question? } → { text?, suggestions[] }.
 * NEVER mutates: the UI applies suggestions through the standard
 * notes/tasks/reminders APIs after explicit user confirmation.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await isFeatureEnabled("ai.assistant", { userId: user.id, role: user.role }))) {
    return NextResponse.json({ error: "AI Assistant is currently disabled." }, { status: 403 });
  }
  const { wid, id } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  if (typeof b.action !== "string" || !(NOTE_AI_ACTIONS as readonly string[]).includes(b.action)) {
    return NextResponse.json(
      { errors: { action: ["Invalid action."] } },
      { status: 400 },
    );
  }
  const action = b.action as NoteAIAction;
  if (action === "ask" && (typeof b.question !== "string" || !b.question.trim())) {
    return NextResponse.json(
      { errors: { question: ["A question is required."] } },
      { status: 400 },
    );
  }

  let note;
  try {
    note = await getUserNote(user.id, wid, id);
  } catch (err) {
    return toApiError(err);
  }
  if (!note.body?.trim() && action !== "generate_title") {
    return NextResponse.json(
      { errors: { form: ["The note is empty — nothing to analyze."] } },
      { status: 400 },
    );
  }

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Add OLLAMA_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  try {
    const result = await runNoteIntelligence(
      action,
      {
        title: note.title,
        body: note.body ?? "",
        question: typeof b.question === "string" ? b.question : undefined,
      },
      new Date(),
    );
    return NextResponse.json({ noteId: note.id, ...result });
  } catch (err) {
    console.error("note intelligence failed", err);
    const raw = err instanceof Error ? err.message : "";
    if (/402|more credits|afford/i.test(raw)) {
      return NextResponse.json(
        { errors: { form: ["The AI run failed. Ollama may be offline. Please try again."] } },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { errors: { form: ["The AI run failed. Please try again."] } },
      { status: 502 },
    );
  }
}
