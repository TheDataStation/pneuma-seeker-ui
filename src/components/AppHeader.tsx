// src/components/AppHeader.tsx
import { getAccessibleDatasets } from "@/lib/api";
import { User } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type AppHeaderProps = {
  isChatListOpen: boolean;
  setIsChatListOpen: (open: boolean) => void;
  handleCreateNewChatSlot: () => void;
  isUserMenuOpen: boolean;
  setIsUserMenuOpen: (open: boolean) => void;
  user: User;
  isLoggingOut: boolean;
  handleLogout: () => void;
  selectedDataset: string;
  accessibleDatasets: string[];
  handleDatasetChange: (dataset: string) => void;
  isDatasetLocked: boolean;
};

export default function AppHeader({
  isChatListOpen,
  setIsChatListOpen,
  handleCreateNewChatSlot,
  isUserMenuOpen,
  setIsUserMenuOpen,
  user,
  isLoggingOut,
  handleLogout,
  selectedDataset,
  accessibleDatasets,
  handleDatasetChange,
  isDatasetLocked,
}: AppHeaderProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsUserMenuOpen]);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="cursor-pointer duration-300 hover:brightness-90 rounded-full border border-sand-strong/70 bg-white p-2 text-slate"
          onClick={() => setIsChatListOpen(!isChatListOpen)}
          aria-pressed={isChatListOpen}
          aria-label={isChatListOpen ? "Hide chats" : "Show chats"}
          title={isChatListOpen ? "Hide chats" : "Show chats"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>

        <button
          className="cursor-pointer duration-300 hover:brightness-90 rounded-full border border-sand-strong/70 bg-white p-2 text-slate"
          onClick={handleCreateNewChatSlot}
          aria-label="New chat"
          title="New chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>

        <div>
          <h1 className="font-display text-2xl text-ink sm:text-2xl">
            Pneuma-Seeker
          </h1>
        </div>

        <select
          name="dataset"
          id="dataset"
          value={selectedDataset}
          onChange={(e) => {
            handleDatasetChange(e.target.value);
          }}
          disabled={isDatasetLocked}
          className="cursor-pointer rounded-full border border-sand-strong/70 bg-white px-3 py-1.5 text-sm text-slate duration-300 hover:brightness-90 focus:outline-none"
        >
          {accessibleDatasets.map((ds) => (
            <option key={ds} value={ds}>
              {ds}
            </option>
          ))}
        </select>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="cursor-pointer duration-300 hover:bg-[#6b0000] rounded-full border border-[#6b0000] bg-[#800000] p-2 text-white"
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          aria-label="User menu"
          title="User menu"
          aria-expanded={isUserMenuOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>

        {isUserMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-sand-strong/70 bg-white shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 text-xs text-slate border-b border-sand-strong/30 truncate">
              Email: {user.email}
            </div>
            <div className="px-4 py-3 text-xs text-slate border-b border-sand-strong/30 truncate">
              Group: {user.group_name}
            </div>
            <button
              type="button"
              className="w-full text-left cursor-pointer duration-300 hover:bg-red-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#800000] disabled:opacity-60"
              onClick={() => {
                handleLogout();
                setIsUserMenuOpen(false);
              }}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Signing out..." : "Log out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
