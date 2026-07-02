// src/components/ChatMessage.tsx
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

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
  assistant: "bg-card border-sand-strong text-ink",
  system: "bg-sand-strong/70 border-sand-strong text-slate",
};

function EmptyState() {
  const [message] = useState(
    () => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full gap-3 py-16 text-center">
      <p className="text-2xl font-medium text-ink/80">{message}</p>
      {/* <p className="text-sm text-slate/60">Ask anything to get started.</p> */}
    </div>
  );
}

function ThinkingProcess({ thoughts, isLatestAssistant }: { thoughts?: string[], isLatestAssistant: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
  };

  // Keep this panel's own scroll pinned to its latest line as thoughts
  // stream in, independent of the outer page's scroll. Instant (direct
  // scrollTop assignment), not smooth/animated — see MainChatArea.tsx's
  // scrollToBottom for why an animated scroll here would risk the same
  // "mid-animation frame misread as user scrolled away" race.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && isAtBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [thoughts]);

  if (!thoughts || thoughts.length === 0) return null;

  return (
    <div className="mb-3 border-l-2 border-sand-strong/80 pl-3 text-xs text-slate/70">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 font-medium text-slate/50 hover:text-slate duration-200 uppercase tracking-wider mb-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transform transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        Thinking Process ({thoughts.length})
      </button>

      {isExpanded && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          data-testid="thinking-process-scroll"
          className="flex flex-col gap-1.5 font-mono bg-sand-strong/10 p-2.5 rounded-lg max-w-full max-h-[60vh] overflow-auto"
        >
          {thoughts.map((thought, index) => {
            const isLastLogLine = index === thoughts.length - 1;
            const shouldPulse = isLatestAssistant && isLastLogLine;

            return (
              <div
                key={index}
                className={`transition-all duration-300 ${shouldPulse ? "animate-pulse font-medium text-ember" : ""}`}
              >
                &gt; {thought}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message, isLatestAssistant = false }: { message: ChatMessageType; isLatestAssistant?: boolean }) {
  const isUser = message.role === "user";
  const align = isUser ? "items-end" : "items-start";
  const bubble = roleStyles[message.role] ?? roleStyles.assistant;

  // Memoized so a re-render caused by unrelated state (isLatestAssistant
  // flipping, a sibling message updating, etc.) doesn't re-run the full
  // marked+DOMPurify pipeline on an unchanged string. This matters most
  // while streaming: content grows on every chunk, so without this, each
  // of the many re-renders a streaming response causes would re-parse the
  // entire accumulated string from scratch, not just the new increment.
  const renderedContent = useMemo(
    () => (!isUser && message.content ? renderMarkdown(message.content) : ""),
    [isUser, message.content],
  );

  return (
    <div className={`flex flex-col ${align} gap-2 rise-in`}>
      <div
        className={`max-w-[80%] rounded-xl border px-5 py-4 text-sm leading-relaxed shadow-sm ${bubble}`}
      >
        {/* Fade thoughts out once final answer arrives instead of abruptly removing */}
        {!isUser && message.thoughts && message.thoughts.length > 0 && (
          <div
            data-testid="thoughts-wrapper"
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              // max-h-screen (100vh) here just needs to safely exceed
              // ThinkingProcess's own inner cap (max-h-[60vh]) on any
              // viewport size, so this wrapper never clips the (already
              // scrollable) inner panel before its own cap kicks in.
              message.content ? "max-h-0 opacity-0" : "max-h-screen opacity-100"
            }`}
          >
            <ThinkingProcess
              thoughts={message.thoughts}
              isLatestAssistant={isLatestAssistant}
            />
          </div>
        )}
        
        {/* Render final message content. fade-in softens the handoff so the
            answer doesn't just pop in exactly as the thinking process collapses.
            Only assistant/system output is markdown-rendered — user input is
            never reinterpreted as markdown, and always shown as literal text. */}
        {message.content ? (
          isUser ? (
            <p className="whitespace-pre-wrap fade-in">{message.content}</p>
          ) : (
            <div
              className="markdown-content fade-in"
              dangerouslySetInnerHTML={{
                __html: renderedContent,
              }}
            />
          )
        ) : (
          // If content is empty but it has thoughts, it's currently actively generating its thoughts step
          !isUser && <span className="inline-flex h-2 w-2 rounded-full bg-slate/40 animate-bounce" />
        )}
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
      {messages.map((msg, i) => {
        // Pass whether this is the absolute last message in the list to trigger active pulsing animations
        const isLatestAssistant = i === messages.length - 1 && msg.role === "assistant";
        return (
          <ChatMessage key={i} message={msg} isLatestAssistant={isLatestAssistant} />
        );
      })}
    </div>
  );
}
