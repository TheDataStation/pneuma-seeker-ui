import { useState } from "react";

type ChatComposerProps = {
  isSending: boolean;
  onSend: (message: string) => void;
  className?: string;
};

export function ChatComposer({ isSending, onSend, className }: ChatComposerProps) {
  const [value, setValue] = useState("");

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
            className="min-h-[60px] w-full resize-none rounded-xl border border-sand-strong/70 bg-white px-4 py-3 pr-14 text-sm text-ink shadow-sm outline-none transition focus:border-ember/50 focus:ring-2 focus:ring-ember/20 overflow-x-hidden"
            placeholder="Ask Pneuma..."
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
            className="cursor-pointer absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ember text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSend}
            disabled={isSending}
            aria-label={isSending ? "Thinking" : "Send"}
            title={isSending ? "Thinking" : "Send"}
          >
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 10h10" />
              <path d="M10 5l5 5-5 5" />
            </svg>
          </button>
        </div>
        {/* <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate/70">
            Shift + Enter for a new line.
          </p>
        </div> */}
      </div>
    </div>
  );
}
