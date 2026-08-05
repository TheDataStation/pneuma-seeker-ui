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
  planMode?: boolean;
  onTogglePlanMode?: () => void;
  useMemory?: boolean;
  onToggleUseMemory?: () => void;
}

function HistoryLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-1 pt-4 animate-pulse">
      {[80, 60, 75].map((w, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div
            className="h-14 rounded-xl bg-sand-strong/40"
            style={{ width: `${w}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function MainChatArea({
  messages,
  isStreaming,
  isHistoryLoading,
  onSend,
  chatKey,
  planMode,
  onTogglePlanMode,
  useMemory,
  onToggleUseMemory,
}: MainChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Always instant, never "smooth": during a long streamed response this
  // fires repeatedly in quick succession (once per thought line). A smooth
  // scroll takes time to animate, and native `scroll` events fire at
  // intermediate, not-yet-caught-up positions while it's in flight — those
  // events reach handleScroll below, which can misread a mid-animation
  // frame as "user scrolled away" and permanently stop auto-scroll for the
  // rest of the message (including the final answer). Instant scrolling
  // reaches the target synchronously, so there's no ambiguous frame to
  // misread.
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
  };

  // Auto-scroll on new/updated messages while user is near bottom
  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom();
  }, [messages]);

  // Keep pinned to bottom through *any* height change of the message content,
  // not just discrete `messages` updates — this includes every intermediate
  // frame of the "thinking process" collapse transition (see ChatMessage.tsx),
  // not just its start/end. Content can grow very tall while streaming log
  // lines, then suddenly collapse to a short final answer; without tracking
  // the transition continuously, the container's scroll position stays
  // wherever it was mid-collapse and the short final answer ends up scrolled
  // out of view, appearing "stuck" until the user manually scrolls.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) scrollToBottom();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [chatKey]);

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
        data-testid="chat-scroll-container"
        className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 fade-in"
      >
        <div ref={contentRef}>
          {isHistoryLoading ? (
            <HistoryLoadingSkeleton />
          ) : (
            <ChatMessageList messages={messages} />
          )}
        </div>
      </div>
      <ChatComposer
        isSending={isStreaming}
        onSend={onSend}
        planMode={planMode}
        onTogglePlanMode={onTogglePlanMode}
        useMemory={useMemory}
        onToggleUseMemory={onToggleUseMemory}
      />
    </main>
  );
}
