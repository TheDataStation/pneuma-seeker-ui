// src/components/ChatSidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatSession } from "@/lib/types";
import { getRelativeTime } from "@/lib/utils";

interface ChatSidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  isOpen: boolean;
  onDeleteChat: (id: string) => void;
  onSearch: (query: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export function ChatSidebar({
  chatSessions,
  activeChatId,
  setActiveChatId,
  isOpen,
  onDeleteChat,
  onSearch,
  hasMore,
  onLoadMore,
  isLoading,
}: ChatSidebarProps) {
  const [searchValue, setSearchValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(val.trim());
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch("");
  };

  const isSearchActive = searchValue.trim().length > 0;

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
        </div>

        {/* Search input */}
        <div className="relative mt-3">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate/50"
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search chats…"
            className="w-full rounded-lg border border-sand-strong/70 bg-white py-1.5 pl-7 pr-7 text-xs text-ink placeholder:text-slate/50 focus:border-ember/40 focus:outline-none focus:ring-1 focus:ring-ember/20"
          />
          {isSearchActive && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate/50 hover:text-slate"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {isLoading && chatSessions.length === 0 ? (
            <p className="text-xs text-slate/70">Loading…</p>
          ) : chatSessions.length === 0 ? (
            <p className="text-xs text-slate/70">
              {isSearchActive ? "No chats match your search." : "No chats yet."}
            </p>
          ) : (
            <>
              {chatSessions.map((chat) => {
                const isActive = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    role="button"
                    tabIndex={0}
                    className={`group cursor-pointer w-full rounded-xl border px-4 py-3 text-left transition select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40 ${isActive
                      ? "border-ember/40 bg-ember/10"
                      : "border-sand-strong/70 bg-white hover:border-ember/30"
                      }`}
                    onClick={() => setActiveChatId(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveChatId(chat.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink truncate min-w-0 flex-1">
                        {chat.title}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[0.62rem] uppercase tracking-[0.2em] text-slate/60 transition-opacity duration-200">
                          {getRelativeTime(chat.lastActive)}
                        </span>

                        <button
                          type="button"
                          className="cursor-pointer flex items-center justify-center p-1 rounded-md text-red-600 hover:bg-red-50 duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          title="Delete chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this chat?")) {
                              onDeleteChat(chat.id);
                            }
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onLoadMore}
                  className="w-full rounded-xl border border-sand-strong/70 bg-white px-4 py-2 text-xs text-slate/70 hover:border-ember/30 hover:text-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Loading…" : "Load more"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
