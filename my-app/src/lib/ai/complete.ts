import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Low-cost single-purpose completions (micro-tasks, not agent runs).
 * Small token budget by default to respect constrained keys. Provider
 * identity resolves per call from the layered config (never cached, so
 * console changes apply immediately).
 */

async function getClient(): Promise<ChatOpenAI> {
  const { getAdapter, resolveChatModel } = await import("@/src/lib/ai/providers");
  const resolved = await resolveChatModel();
  const adapter = getAdapter({
    id: resolved.providerId,
    label: resolved.providerLabel,
    enabled: true,
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
  });
  return adapter.buildChatModel(resolved.model, {
    temperature: 0.2,
    maxTokens: 500,
    maxRetries: 0,
  });
}

export async function completeText(
  system: string,
  user: string,
): Promise<string> {
  const client = await getClient();
  const message = await client.invoke([new SystemMessage(system), new HumanMessage(user)]);
  const content = message.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: string; text?: string } => typeof b === "object" && b !== null)
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("")
      .trim();
  }
  return "";
}

/** Complete with strict-JSON instruction; extracts the first {...} block. */
export async function completeJson<T>(system: string, user: string): Promise<T> {
  const raw = await completeText(
    `${system} Respond with strict JSON only. No markdown fences, no commentary.`,
    user,
  );
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("The AI returned an unparseable response. Please try again.");
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
