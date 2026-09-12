import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { createAgent as createLangChainAgent } from "langchain";
import { getEffectiveAIConfig, type EffectiveAIConfig } from "@/src/lib/ai/config";
import { buildSystemPrompt } from "@/src/lib/ai/prompts";
import { makeTools, type ToolContext } from "@/src/lib/ai/tools";
import { getAdapter, resolveChatModel, type AIModelConfig } from "@/src/lib/ai/providers";

/**
 * Agent assembly: AI Service → Provider Adapter → Selected Model.
 * Model, sampling, retries, tools, and the system prompt resolve per turn
 * from the layered config (env + admin settings) — never cached across
 * turns, so console changes apply to the next request. The prompt override
 * is plain text data (validated length, never evaluated); the tool
 * allowlist only selects from the fixed registry in tools.ts.
 */

export interface AgentMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
}

export function toLangChainMessages(history: AgentMessage[]) {
  return history.map((m) => {
    if (m.role === "user") return new HumanMessage(m.content);
    if (m.role === "tool") return new ToolMessage(m.content, m.toolName ?? "tool");
    return new AIMessage(m.content);
  });
}

export async function createAgent(ctx: ToolContext, now = new Date()) {
  const [config, resolved] = await Promise.all([getEffectiveAIConfig(), resolveChatModel()]);
  const adapter = getAdapter({
    id: resolved.providerId,
    label: resolved.providerLabel,
    enabled: true,
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
  });
  const [model, tools] = await Promise.all([
    Promise.resolve(
      adapter.buildChatModel(resolved.model, {
        temperature: resolved.temperature,
        maxTokens: resolved.maxTokens,
        maxRetries: config.maxRetries,
      }),
    ),
    Promise.resolve(makeTools(ctx, { allowlist: config.toolAllowlist ?? undefined })),
  ]);
  return {
    agent: await createLangChainAgent({
      model,
      tools,
      systemPrompt: config.systemPrompt ?? buildSystemPrompt(now),
    }),
    config,
    resolved,
  };
}

export type NotoAIAgent = Awaited<ReturnType<typeof createAgent>>["agent"];
export type { EffectiveAIConfig, AIModelConfig };
