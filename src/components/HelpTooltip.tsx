// src/components/HelpTooltip.tsx
"use client";
import { useId, useRef, useState } from "react";
import { useClickOutside } from "@/lib/useClickOutside";

interface HelpTooltipProps {
  text: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Small rounded "?" affordance that reveals a plain-language explanation on
 * hover (desktop) or tap (touch devices, which don't fire hover events).
 *
 * Hovering and clicking are tracked separately (`isHovering` / `isPinned`):
 * a real mouse click is always preceded by hovering, so if a single
 * "isOpen" flag were closed by mouseleave regardless of how it was opened,
 * clicking would deliver no benefit over hover alone — moving the mouse
 * away would always close it immediately either way. Tracking them
 * separately means a click actually pins it open (readable without holding
 * the mouse still) until you click elsewhere, while hover-only opens still
 * close on mouseleave as expected.
 */
export function HelpTooltip({
  text,
  className = "",
  ariaLabel = "What does this step do?",
}: HelpTooltipProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const isOpen = isHovering || isPinned;
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useClickOutside(
    wrapperRef,
    () => {
      setIsPinned(false);
      setIsHovering(false);
    },
    isOpen,
  );

  return (
    <span ref={wrapperRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-sand-strong/70 bg-card text-[0.65rem] font-bold text-slate/60 transition hover:border-ember/40 hover:text-ember"
        onClick={(e) => {
          // Step headings this sits inside are themselves clickable
          // (accordion toggle) — don't let that fire too.
          e.stopPropagation();
          setIsPinned(true);
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        ?
      </button>
      {isOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-sand-strong/70 bg-card px-3 py-2 text-xs font-normal leading-relaxed text-ink shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
