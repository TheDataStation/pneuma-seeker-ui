// src/components/AppHeader.tsx
import { User } from "@/lib/types";
import Link from "next/link";
import { useEffect, useRef } from "react";

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
  isDark: boolean;
  onToggleDark: () => void;
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
  isDark,
  onToggleDark,
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
          className="cursor-pointer duration-300 hover:brightness-90 rounded-full border border-sand-strong/70 bg-card p-2 text-slate"
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
          className="cursor-pointer duration-300 hover:brightness-90 rounded-full border border-sand-strong/70 bg-card p-2 text-slate"
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
          className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1.5 text-sm text-slate duration-300 hover:brightness-90 focus:outline-none"
        >
          {accessibleDatasets.map((ds) => (
            <option key={ds} value={ds}>
              {ds}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          type="button"
          className="cursor-pointer duration-300 hover:brightness-90 rounded-full border border-sand-strong/70 bg-card p-2 text-slate"
          onClick={onToggleDark}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            /* Sun icon for dark mode (click to go light) */
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
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            /* Moon icon for light mode (click to go dark) */
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
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* User menu */}
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
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-sand-strong/70 bg-card shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 text-xs text-slate border-b border-sand-strong/30 truncate">
                Email: {user.email}
              </div>
              <div className="px-4 py-3 text-xs text-slate border-b border-sand-strong/30 truncate">
                Group: {user.group_name}
              </div>
              <Link
                href="/profile"
                className="block w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate hover:bg-sand/60 dark:hover:bg-white/5 transition-colors"
                onClick={() => setIsUserMenuOpen(false)}
              >
                Profile settings
              </Link>
              {user.group_name === "admin" && (
                <Link
                  href="/admin"
                  className="block w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate hover:bg-sand/60 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Admin panel
                </Link>
              )}
              <button
                type="button"
                className="w-full text-left cursor-pointer duration-300 hover:bg-red-50 dark:hover:bg-red-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#800000] disabled:opacity-60"
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
      </div>
    </header>
  );
}
