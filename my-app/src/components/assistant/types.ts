/** Assistant UI vocabulary. Transport-agnostic (works over SSE today). */

export interface ActionCardData {
  type: string;
  label: string;
  href?: string;
}

export interface ToolResultData {
  name: string;
  summary: string;
}

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ActionCardData[];
  tools?: ToolResultData[];
  streaming?: boolean;
  error?: string;
}

let msgSeq = 0;
export function nextMsgId(): string {
  msgSeq += 1;
  return `msg-${Date.now()}-${msgSeq}`;
}

export const SUGGESTIONS: string[] = [
  "Create a task to learn React tomorrow at 9 AM.",
  "Plan my tomorrow.",
  "Summarize my React notes.",
  "Show my overdue tasks.",
  "Create a weekly plan for my project.",
  "Move low priority tasks to tomorrow.",
];
