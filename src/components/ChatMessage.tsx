import type { ChatMessage as ChatMessageType } from "@/lib/types";

const roleStyles: Record<string, string> = {
  user: "bg-ember/10 border-ember/40 text-ink",
  assistant: "bg-white border-sand-strong text-ink",
  system: "bg-sand-strong/70 border-sand-strong text-slate",
};

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const align = isUser ? "items-end" : "items-start";
  const bubble = roleStyles[message.role] ?? roleStyles.assistant;

  return (
    <div className={`flex flex-col ${align} gap-2 rise-in`}>
      <span className="text-xs uppercase tracking-[0.2em] text-slate/70">
        {isUser ? "You" : "Pneuma-Seeker"}
      </span>
      <div
        className={`max-w-[80%] rounded-3xl border px-5 py-4 text-sm leading-relaxed shadow-sm ${bubble}`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
