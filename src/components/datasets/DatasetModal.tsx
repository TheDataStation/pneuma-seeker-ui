// src/components/datasets/DatasetModal.tsx
"use client";

import type { ReactNode } from "react";

/** The overlay and panel the dataset dialogs share; `onClose` is ignored while `busy`. */
export function DatasetModal({
  title,
  busy = false,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  busy?: boolean;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`panel w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-[15px] p-6 rise-in`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">{title}</h2>
          <button
            className="cursor-pointer rounded-full p-1 text-slate hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldClasses =
  "w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20 disabled:opacity-60";
export const labelClasses = "text-xs font-semibold uppercase tracking-[0.18em] text-slate/70";
export const primaryButton =
  "cursor-pointer rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white duration-300 hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButton =
  "cursor-pointer rounded-xl border border-sand-strong/70 px-4 py-2 text-sm font-semibold text-slate hover:text-ink disabled:cursor-not-allowed disabled:opacity-60";
export const dangerButton =
  "cursor-pointer rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950 dark:text-red-400";
