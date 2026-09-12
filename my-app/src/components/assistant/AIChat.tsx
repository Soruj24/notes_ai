"use client";

import { useEffect, useRef, useState } from "react";
import { AIInput } from "@/src/components/assistant/AIInput";
import { AIMessage } from "@/src/components/assistant/AIMessage";
import { AISuggestions } from "@/src/components/assistant/AISuggestions";
import {
  nextMsgId,
  type ActionCardData,
  type ChatMsg,
  type ToolResultData,
} from "@/src/components/assistant/types";

interface AIChatProps {
  wid: string;
  showSuggestions?: boolean;
}

/**
 * Streaming chat. POSTs to the SSE command endpoint and folds
 * text/tool/done events into message state. No LangChain imports here —
 * the component only speaks SSE + JSON.
 */
export function AIChat({ wid, showSuggestions = true }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const lastUserText = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Follow the stream only when already near the bottom — never yank
    // readers who scrolled up to re-read.
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function patchAssistant(id: string, patch: Partial<ChatMsg>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function appendAssistantText(id: string, delta: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
    );
  }

  function appendTool(id: string, tool: ToolResultData) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, tools: [...(m.tools ?? []), tool] } : m,
      ),
    );
  }

  async function send(text: string) {
    lastUserText.current = text;
    const userMsg: ChatMsg = { id: nextMsgId(), role: "user", content: text };
    const assistantId = nextMsgId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setStreaming(true);
    try {
      const res = await fetch(`/api/workspaces/${wid}/ai/command`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });
      if (!res.ok || !res.body) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
          errors?: Record<string, string[]>;
        } | null;
        const message =
          json?.error ??
          json?.errors?.message?.join(" ") ??
          json?.errors?.form?.join(" ") ??
          "Request failed.";
        patchAssistant(assistantId, { streaming: false, error: message });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const eventLine = block.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice("event: ".length);
          const data = JSON.parse(dataLine.slice("data: ".length)) as Record<string, unknown>;
          if (event === "text" && typeof data.delta === "string") {
            appendAssistantText(assistantId, data.delta);
          } else if (event === "tool_end") {
            appendTool(assistantId, {
              name: String(data.name ?? "tool"),
              summary: String(data.summary ?? ""),
            });
          } else if (event === "done") {
            if (typeof data.conversationId === "string") {
              setConversationId(data.conversationId);
            }
            patchAssistant(assistantId, {
              streaming: false,
              actions: (data.actions ?? []) as ActionCardData[],
            });
          } else if (event === "error") {
            patchAssistant(assistantId, {
              streaming: false,
              error: String(data.message ?? "Agent run failed."),
            });
          }
        }
      }
      patchAssistant(assistantId, { streaming: false });
    } catch {
      patchAssistant(assistantId, { streaming: false, error: "Network error. Please try again." });
    } finally {
      setStreaming(false);
    }
  }

  function retryFailed(id: string) {
    const text = lastUserText.current;
    if (!text || streaming) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    void send(text);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        ref={scrollRef}
        role="log"
        aria-label="Conversation"
        className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto pr-0.5"
      >
        {messages.length === 0 && showSuggestions ? (
          <AISuggestions onPick={(text) => void send(text)} />
        ) : null}
        {messages.map((message) => (
          <AIMessage
            key={message.id}
            message={message}
            onRetry={message.error ? () => retryFailed(message.id) : undefined}
          />
        ))}
        {streaming ? <span className="sr-only" role="status">Assistant is responding…</span> : null}
      </div>
      <AIInput onSend={(text) => void send(text)} streaming={streaming} />
    </div>
  );
}
