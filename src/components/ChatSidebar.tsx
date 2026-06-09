// src/components/ChatSidebar.tsx
"use client";

import type { ChatSession } from "@/lib/types";

interface ChatSidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  isOpen: boolean;
}

const rtf = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function getRelativeTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units = [
    { unit: "year", secs: 31536000 },
    { unit: "month", secs: 2592000 },
    { unit: "week", secs: 604800 },
    { unit: "day", secs: 86400 },
    { unit: "hour", secs: 3600 },
    { unit: "minute", secs: 60 },
    { unit: "second", secs: 1 },
  ] as const;
  for (const { unit, secs } of units) {
    if (Math.abs(diffSeconds) >= secs || unit === "second") {
      return rtf.format(Math.round(diffSeconds / secs), unit);
    }
  }
  return "Now";
}

export function ChatSidebar({
  chatSessions,
  activeChatId,
  setActiveChatId,
  isOpen,
}: ChatSidebarProps) {
  return (
    <aside
      className={`relative min-w-0 overflow-hidden transition-all duration-300 ${isOpen ? "w-72 opacity-100" : "w-0 opacity-0"
        }`}
      aria-hidden={!isOpen}
    >
      <div
        className={`panel flex h-full flex-col rounded-[15px] p-5 ${isOpen ? "" : "pointer-events-none"
          }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Chats</h2>
          {/* <span className="text-xs text-slate/70">{chatSessions.length}</span> */}
        </div>
        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {chatSessions.length === 0 ? (
            <p className="text-xs text-slate/70">No chats yet.</p>
          ) : (
            chatSessions.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <button
                  key={chat.id}
                  className={`cursor-pointer w-full rounded-xl border px-4 py-3 text-left transition ${isActive
                    ? "border-ember/40 bg-ember/10"
                    : "border-sand-strong/70 bg-white hover:border-ember/30"
                    }`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">
                      {chat.title}
                    </span>
                    <span className="text-[0.62rem] uppercase tracking-[0.2em] text-slate/60">
                      {getRelativeTime(chat.lastActive)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
