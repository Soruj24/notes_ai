import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { getEffectiveAIConfig, isAIConfigured } from "@/src/lib/ai/config";
import { createAgent, toLangChainMessages, type AgentMessage } from "@/src/lib/ai/agent";
import {
  appendMessage,
  createConversation,
  getConversation,
  getUserDailyUsage,
  listMessages,
} from "@/src/repositories/ai.repository";

export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ wid: string }>;
}

interface ActionCard {
  type: string;
  label: string;
  href?: string;
}

function send(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: string,
  data: unknown,
): void {
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
  );
}

function chunkText(chunk: unknown): string {
  const content = (chunk as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: string; text?: string } => typeof b === "object" && b !== null)
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("");
  }
  return "";
}

function chunkToolCalls(chunk: unknown): Array<{ name: string; args: unknown }> {
  const calls = (chunk as { tool_calls?: Array<{ name?: string; args?: unknown }> }).tool_calls;
  if (!Array.isArray(calls)) return [];
  return calls
    .filter((c) => typeof c.name === "string")
    .map((c) => ({ name: c.name as string, args: c.args }));
}

/** Map provider/SDK failures to user-facing messages (no raw error leaks). */
function toUserError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Agent run failed.";
  if (/402|insufficient.*credit|more credits|afford/i.test(message)) {
    return "The AI assistant is not responding. Check Ollama is running and try again.";
  }
  if (/401|invalid.*(key|api key)|unauthorized/i.test(message)) {
    return "The AI key was rejected. Check OLLAMA_API_KEY and try again.";
  }
  if (/429|rate.?limit|overloaded/i.test(message)) {
    return "The AI provider is rate-limited right now. Wait a minute and retry.";
  }
  return "The assistant run failed. Please try again.";
}

function actionFromTool(name: string, output: string): ActionCard | null {
  try {
    const parsed = JSON.parse(output) as { id?: string; title?: string; name?: string; href?: string };
    if (!parsed.title && !parsed.name) return null;
    const label = parsed.title ?? parsed.name ?? name;
    const type = name.replace(/^(create_|list_|get_|update_|complete_|reopen_)/, "");
    return { type, label, href: parsed.href };
  } catch {
    return null;
  }
}

/**
 * POST /api/workspaces/[wid]/ai/command — stream a deep-agent turn.
 * Body: { message, conversationId? }. SSE: text | tool_start | tool_end | done | error.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const message = typeof parsed.body.message === "string" ? parsed.body.message.trim() : "";
  if (!message || message.length > 2000) {
    return NextResponse.json(
      { errors: { message: ["Message is required (max 2000 characters)."] } },
      { status: 400 },
    );
  }
  const conversationId =
    typeof parsed.body.conversationId === "string" && parsed.body.conversationId
      ? parsed.body.conversationId
      : undefined;

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Add OLLAMA_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  // Layered console config: kill switch + per-user daily budgets.
  // Checked before any conversation/message rows are written.
  const effective = await getEffectiveAIConfig();
  if (!effective.enabled) {
    return NextResponse.json(
      { error: "The AI assistant is disabled by the administrator." },
      { status: 503 },
    );
  }
  const { isFeatureEnabled } = await import("@/src/lib/features/evaluation");
  if (!(await isFeatureEnabled("ai.assistant", { userId: user.id, role: user.role }))) {
    return NextResponse.json(
      { error: "AI Assistant is currently disabled." },
      { status: 503 },
    );
  }

  // Short-window abuse guard (in addition to the daily budgets below).
  const { checkRateLimit } = await import("@/src/lib/rate-limit/limit");
  const burst = await checkRateLimit({ key: `ai:command:${user.id}`, limit: 20, windowMs: 60_000 });
  if (!burst.allowed) {
    const { logSecurityEvent } = await import("@/src/services/security.service");
    await logSecurityEvent({
      type: "rate.limited",
      userId: user.id,
      metadata: { endpoint: "ai.command" },
    }).catch(() => undefined);
    return NextResponse.json(
      { error: "Too many AI requests. Wait a minute and retry." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(burst.resetMs / 1000)) } },
    );
  }
  // Per-model budgets override the globals when set (>0 inherits global).
  // Resolution is read-only here; the agent resolves once more for the turn
  // (same inputs → same selection).
  const { resolveChatModel } = await import("@/src/lib/ai/providers");
  let resolvedModel = "unknown";
  try {
    const resolved = await resolveChatModel();
    resolvedModel = resolved.model;
    const reqLimit = resolved.dailyRequestLimit > 0 ? resolved.dailyRequestLimit : effective.requestsPerUserPerDay;
    const tokLimit = resolved.dailyTokenLimit > 0 ? resolved.dailyTokenLimit : effective.tokensPerUserPerDay;
    if (reqLimit > 0 || tokLimit > 0) {
      const now = new Date();
      const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const usage = await getUserDailyUsage(user.id, midnight);
      if (reqLimit > 0 && usage.messages >= reqLimit) {
        return NextResponse.json(
          { error: "Daily AI request limit reached. Try again tomorrow." },
          { status: 429 },
        );
      }
      if (tokLimit > 0 && usage.tokens >= tokLimit) {
        return NextResponse.json(
          { error: "Daily AI token budget reached. Try again tomorrow." },
          { status: 429 },
        );
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No AI providers are available." },
      { status: 503 },
    );
  }

  let conversation;
  try {
    conversation = conversationId
      ? await getConversation(user.id, wid, conversationId)
      : await createConversation({
          userId: user.id,
          workspaceId: wid,
          title: message.slice(0, 60),
          model: resolvedModel,
        });
  } catch (err) {
    return toApiError(err);
  }
  try {
    await appendMessage({
      userId: user.id,
      workspaceId: wid,
      conversationId: conversation.id,
      role: "user",
      content: message,
    });
  } catch (err) {
    return toApiError(err);
  }

  const history: AgentMessage[] = (await listMessages(user.id, wid, conversation.id, 20)).map(
    (m) => ({
      role: m.role === "user" ? "user" : m.role === "tool" ? "tool" : "assistant",
      content: m.content,
      toolName: m.toolName,
    }),
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let transcript = "";
      const toolRecords: Array<{ name: string; summary: string }> = [];
      const actions: ActionCard[] = [];
      const seenTools = new Set<string>();
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), effective.timeoutMs);
      try {
        const { agent } = await createAgent({ userId: user.id, workspaceId: wid });
        const raw = await agent.stream(
          { messages: toLangChainMessages(history) },
          { streamMode: ["messages", "updates"], recursionLimit: effective.recursionLimit, signal: abortController.signal },
        );
        const events = raw as unknown as AsyncIterable<[string, unknown]>;
        for await (const [mode, payload] of events) {
          if (mode === "messages") {
            const [chunk] = payload as [unknown, unknown];
            const delta = chunkText(chunk);
            if (delta) {
              transcript += delta;
              send(controller, encoder, "text", { delta });
            }
            for (const call of chunkToolCalls(chunk)) {
              const key = `${call.name}:${JSON.stringify(call.args)}`;
              if (seenTools.has(key)) continue;
              seenTools.add(key);
              send(controller, encoder, "tool_start", { name: call.name });
            }
          } else if (mode === "updates") {
            const update = payload as Record<string, { messages?: unknown[] }>;
            for (const state of Object.values(update)) {
              for (const msg of state.messages ?? []) {
                const kind = (msg as { _getType?: () => string })?._getType?.();
                if (kind !== "tool") continue;
                const toolMsg = msg as { name?: string; content?: unknown };
                const name = toolMsg.name ?? "tool";
                const output =
                  typeof toolMsg.content === "string"
                    ? toolMsg.content
                    : JSON.stringify(toolMsg.content);
                const summary = output.slice(0, 500);
                toolRecords.push({ name, summary });
                send(controller, encoder, "tool_end", { name, summary });
                const action = actionFromTool(name, output);
                if (action) actions.push(action);
              }
            }
          }
        }
        await appendMessage({
          userId: user.id,
          workspaceId: wid,
          conversationId: conversation.id,
          role: "assistant",
          content: transcript || "(no response)",
        });
        for (const record of toolRecords) {
          await appendMessage({
            userId: user.id,
            workspaceId: wid,
            conversationId: conversation.id,
            role: "tool",
            content: record.summary,
            toolName: record.name,
          });
        }
        send(controller, encoder, "done", { conversationId: conversation.id, actions });
        controller.close();
      } catch (err) {
        const rawMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        const aborted = /abort/i.test(rawMsg);
        send(controller, encoder, "error", {
          message: aborted
            ? "The assistant took too long. Please try a shorter request."
            : toUserError(err),
        });
        if (!aborted) {
          // Staff alert (hourly dedupe): infra failures are critical,
          // model-level failures are warnings. Fire-and-forget.
          const infra =
            /fetch failed|ECONNREFUSED|ENOTFOUND|Unreachable|network|socket|timeout|connection error|EAI_AGAIN|502|503|504/i.test(
              rawMsg,
            );
          const { notifyAdmin } = await import(
            "@/src/services/admin-notifications.service"
          ).catch(() => ({ notifyAdmin: undefined as never }));
          if (notifyAdmin) {
            void notifyAdmin({
              title: infra ? "AI provider unreachable" : "AI assistant turn failed",
              body: infra
                ? `Provider calls are failing (${rawMsg.slice(0, 120)}).`
                : `An assistant turn errored (${rawMsg.slice(0, 120)}).`,
              severity: infra ? "critical" : "warning",
              priority: infra ? "urgent" : "high",
              source: infra ? "system" : "ai",
              linkHref: "/admin/ai",
              dedupeMin: 60,
            });
          }
        }
        controller.close();
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
