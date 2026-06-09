// src/components/MainChatArea.tsx
"use client";
import { ChatMessageList } from "@/components/ChatMessage";
import { ChatComposer } from "@/components/ChatComposer";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface MainChatAreaProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  onSend: (content: string) => Promise<void>;
}

export function MainChatArea({ messages, isStreaming, onSend }: MainChatAreaProps) {
  return (
    <main className="flex h-full min-h-0 flex-col gap-6">
      <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2">
        <ChatMessageList messages={messages} />
      </div>
      <ChatComposer isSending={isStreaming} onSend={onSend} />
    </main>
  );
}
