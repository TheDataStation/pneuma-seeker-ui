// src/components/ChatComposer.tsx
import { useEffect, useRef, useState } from "react";

type ChatComposerProps = {
  isSending: boolean;
  onSend: (message: string) => void;
  className?: string;
  planMode?: boolean;
  onTogglePlanMode?: () => void;
};

const TEXTAREA_MIN_HEIGHT = 40;
const TEXTAREA_MAX_HEIGHT = 200;

export function ChatComposer({
  isSending,
  onSend,
  className,
  planMode = false,
  onTogglePlanMode,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea to fit its content, up to a capped height beyond
  // which it scrolls internally instead of pushing the rest of the layout.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_HEIGHT), TEXTAREA_MAX_HEIGHT)}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className={`panel rounded-xl p-4 ${className ?? ""}`}>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="max-h-[200px] min-h-[40px] w-full resize-none rounded-xl border border-sand-strong/70 bg-card px-4 py-2 pr-12 text-sm text-ink shadow-sm outline-none transition focus:border-ember/50 focus:ring-2 focus:ring-ember/20 overflow-x-hidden"
            placeholder="Ask Pneuma-Seeker..."
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!isSending) handleSend();
              }
            }}
          />
          <button
            type="button"
            className="cursor-pointer absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ember text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSend}
            disabled={isSending || !value.trim()}
            aria-label={isSending ? "Thinking" : "Send"}
            title={isSending ? "Thinking" : "Send"}
          >
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 16V6" />
              <path d="M5 10l5-5 5 5" />
            </svg>
          </button>
        </div>
        {onTogglePlanMode && (
          <div className="flex items-center">
            <button
              type="button"
              aria-pressed={planMode}
              onClick={onTogglePlanMode}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                planMode
                  ? "border-ember/60 bg-ember/10 text-ember"
                  : "border-sand-strong/70 text-slate/70 hover:border-sand-strong hover:text-slate"
              }`}
              title={
                planMode
                  ? "Plan mode on: the next message will get a proposal instead of a computed answer"
                  : "Plan mode: propose a plan for confirmation before computing an answer"
              }
            >
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 4h12v3H4z" />
                <path d="M4 10h8M4 13h5" />
              </svg>
              Plan mode
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
