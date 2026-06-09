import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { useState } from "react";

const WELCOME_MESSAGES = [
  "What can I help with?",
  "What's on your mind?",
  "What's next?",
  "How can I help you today?",
  "What are you exploring?",
  "Where shall we begin?",
  "What would you like to know?",
  "Ready when you are.",
  "What's stirring?",
  "What shall we uncover?",
];

const roleStyles: Record<string, string> = {
  user: "bg-ember/10 border-ember/40 text-ink",
  assistant: "bg-white border-sand-strong text-ink",
  system: "bg-sand-strong/70 border-sand-strong text-slate",
};

function EmptyState() {
  const [message] = useState(
    () => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full gap-3 py-16 text-center">
      <p className="text-2xl font-medium text-ink/80">{message}</p>
      <p className="text-sm text-slate/60">Ask anything to get started.</p>
    </div>
  );
}

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const align = isUser ? "items-end" : "items-start";
  const bubble = roleStyles[message.role] ?? roleStyles.assistant;

  return (
    <div className={`flex flex-col ${align} gap-2 rise-in`}>
      <div
        className={`max-w-[80%] rounded-xl border px-5 py-4 text-sm leading-relaxed shadow-sm ${bubble}`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function ChatMessageList({ messages }: { messages: ChatMessageType[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col flex-1 h-full">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {messages.map((msg, i) => (
        <ChatMessage key={i} message={msg} />
      ))}
    </div>
  );
}
