// src/components/MainChatArea.tsx
"use client";
import { ChatMessageList } from "@/components/ChatMessage";
import { ChatComposer } from "@/components/ChatComposer";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { useEffect, useRef } from "react";

interface MainChatAreaProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  isHistoryLoading: boolean;
  onSend: (content: string) => Promise<void>;
  chatKey: string;
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

export function MainChatArea({ messages, isStreaming, isHistoryLoading, onSend, chatKey }: MainChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
  };

  // Auto-scroll on new/updated messages while user is near bottom
  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom();
  }, [messages]);

  // After thoughts collapse animation finishes (~500ms), scroll to reveal the short final answer
  useEffect(() => {
    if (!isStreaming) {
      const timer = setTimeout(() => scrollToBottom(), 550);
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  // Reset "at bottom" tracking when switching chats
  useEffect(() => {
    isAtBottomRef.current = true;
  }, [chatKey]);

  return (
    <main className="flex h-full min-h-0 flex-col gap-6">
      <div
        key={chatKey}
        ref={scrollRef}
        onScroll={handleScroll}
        className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 fade-in"
      >
        {isHistoryLoading ? <HistoryLoadingSkeleton /> : <ChatMessageList messages={messages} />}
      </div>
      <ChatComposer isSending={isStreaming} onSend={onSend} />
    </main>
  );
}
