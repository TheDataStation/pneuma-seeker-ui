// src/components/MainChatArea.tsx
"use client";
import { ChatMessageList } from "@/components/ChatMessage";
import { ChatComposer } from "@/components/ChatComposer";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface MainChatAreaProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  isHistoryLoading: boolean;
  onSend: (content: string) => Promise<void>;
}

function HistoryLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-1 pt-4 animate-pulse">
      {[80, 60, 75].map((w, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
          <div
            className="h-14 rounded-xl bg-sand-strong/40"
            style={{ width: `${w}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function MainChatArea({ messages, isStreaming, isHistoryLoading, onSend }: MainChatAreaProps) {
  return (
    <main className="flex h-full min-h-0 flex-col gap-6">
      <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2">
        {isHistoryLoading ? <HistoryLoadingSkeleton /> : <ChatMessageList messages={messages} />}
      </div>
      <ChatComposer isSending={isStreaming} onSend={onSend} />
    </main>
  );
}
